const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const ExcelJS = require("exceljs");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

const authMiddleware = require("./middleware/authMiddleware");

const app = express();
require("dotenv").config();

app.use(cors());
app.use(express.json());

// ✅ STATIC UPLOADS
app.use("/uploads", express.static("uploads"));

// ✅ DB CONNECTION
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) console.log("❌ DB ERROR:", err);
  else console.log("✅ MySQL Connected");
});
// ============================
// 🕒 TIME CONVERTER
// ============================
const convertToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

// ============================
// ✅ GET ACTIVE SHIFT SETTINGS
// ============================
const getActiveShiftSettings = () => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT *
      FROM shift_settings
      WHERE is_active = 1
      LIMIT 1
    `;

    db.query(query, (err, results) => {
      if (err) {
        reject(err);
      } else {
        if (results.length === 0) {
          reject("No active shift settings");
        } else {
          resolve(results[0]);
        }
      }
    });
  });
};

// ============================
// 📥 FETCH SHIFT SETTINGS API
// ============================
app.get("/api/shift-settings", async (req, res) => {
  const query = `
    SELECT *
    FROM shift_settings
    ORDER BY id ASC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.log(err);

      return res.json({
        error: "Failed to fetch settings",
      });
    }
    res.json(results);
  });
});

// ============================
// 🔄 TOGGLE SHIFT MODE
// ============================
app.put("/api/shift-settings/:id", (req, res) => {
  const { id } = req.params;

  const resetQuery = `
    UPDATE shift_settings
    SET is_active = 0
  `;

  db.query(resetQuery, (err) => {
    if (err) {
      console.log(err);

      return res.json({
        error: "Reset failed",
      });
    }

    const activateQuery = `
      UPDATE shift_settings
      SET is_active = 1
      WHERE id = ?
    `;

    db.query(activateQuery, [id], (err2) => {
      if (err2) {
        console.log(err2);

        return res.json({
          error: "Activation failed",
        });
      }

      res.json({
        message: "Shift updated successfully",
      });
    });
  });
});

// ============================
// 📸 MULTER STORAGE
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
});

// ============================
// 🔥 AUTO CLOSE OLD SESSIONS
// ============================
const autoCloseSessions = async () => {
  try {
    const settings = await getActiveShiftSettings();

    const query = `
      SELECT *
      FROM attendance
      WHERE logout_time IS NULL
    `;

    db.query(query, (err, results) => {
      if (err) {
        console.log("AUTO CLOSE ERROR:", err);
        return;
      }

      const now = new Date();

      results.forEach((record) => {
        const loginTime = new Date(record.login_time);

        let autoLogoutTime = new Date(loginTime);

        // ✅ MORNING
        if (record.shift === "Morning") {
          const [hours, minutes] = settings.day_logout.split(":");

          autoLogoutTime.setHours(hours);
          autoLogoutTime.setMinutes(minutes);
          autoLogoutTime.setSeconds(0);
        }

        // ✅ NIGHT
        else if (record.shift === "Night") {
          const [hours, minutes] = settings.night_logout.split(":");

          autoLogoutTime.setDate(autoLogoutTime.getDate() + 1);

          autoLogoutTime.setHours(hours);
          autoLogoutTime.setMinutes(minutes);
          autoLogoutTime.setSeconds(0);
        }

        // ✅ AUTO CLOSE
        if (now >= autoLogoutTime) {
          const totalHours = (autoLogoutTime - loginTime) / (1000 * 60 * 60);

          const updateQuery = `
            UPDATE attendance
            SET
              logout_time = ?,
              total_hours = ?,
              logout_status = ?
            WHERE id = ?
          `;

          db.query(
            updateQuery,
            [autoLogoutTime, totalHours.toFixed(2), "Auto Closed", record.id],
            (updateErr) => {
              if (updateErr) {
                console.log("AUTO UPDATE ERROR:", updateErr);
              } else {
                console.log(`✅ AUTO CLOSED: ${record.user}`);
              }
            },
          );
        }
      });
    });
  } catch (err) {
    console.log(err);
  }
};

// ✅ RUN AUTO CLOSE EVERY 1 MINUTE
setInterval(() => {
  autoCloseSessions();
}, 60000);

// ============================
// 🌴 AUTO CREATE OFF RECORDS
// ============================
const autoCreateOffRecords = () => {
  const today = new Date().toISOString().split("T")[0];

  const leaveQuery = `
    SELECT *
    FROM leaves
    WHERE leave_date = ?
  `;

  db.query(leaveQuery, [today], (err, leaves) => {
    if (err) {
      console.log("OFF CHECK ERROR:", err);
      return;
    }

    leaves.forEach((leave) => {
      const checkAttendance = `
        SELECT *
        FROM attendance
        WHERE LOWER(user) = LOWER(?)
        AND DATE(login_time) = ?
      `;

      db.query(checkAttendance, [leave.user_email, today], (err2, existing) => {
        if (err2) {
          console.log(err2);
          return;
        }

        if (existing.length === 0) {
          const insertOff = `
              INSERT INTO attendance (
                user,
                login_time,
                logout_time,
                total_hours,
                shift,
                logout_status
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `;

          const offTime = `${today} 00:00:00`;

          db.query(
            insertOff,
            [leave.user_email, offTime, offTime, 0, "Off", "Off"],
            (err3) => {
              if (err3) {
                console.log("OFF INSERT ERROR:", err3);
              } else {
                console.log(`✅ OFF CREATED: ${leave.user_email}`);
              }
            },
          );
        }
      });
    });
  });
};

// ✅ RUN OFF AUTOMATION EVERY 1 MINUTE
setInterval(() => {
  autoCreateOffRecords();
}, 60000);

// ============================
// 🔐 LOGIN
// ============================
app.post("/api/login", (req, res) => {
  let { username, password, timezone } = req.body;

  console.log("🔥 LOGIN API HIT:", username);

  if (!username || !password) {
    return res.json({
      error: "Missing credentials",
    });
  }

  username = username.toLowerCase().trim();

  const userQuery = `
    SELECT * FROM users
    WHERE LOWER(email) = LOWER(?)
    AND is_active = true
  `;

  db.query(userQuery, [username], (err, users) => {
    if (err) {
      return res.json({
        error: "DB error",
      });
    }

    if (users.length === 0) {
      return res.json({
        error: "User not found",
      });
    }

    const user = users[0];

    bcrypt.compare(password, user.password, async (err2, isMatch) => {
      if (err2) {
        return res.json({
          error: "Server error",
        });
      }

      if (!isMatch) {
        return res.json({
          error: "Invalid password",
        });
      }

      // ============================
      // ✅ ADMIN LOGIN
      // ============================
      if (user.role === "admin") {
        return res.json({
          role: "admin",
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image: user.profile_image,
          email: user.email,
        });
      }

      // ============================
      // ✅ TL LOGIN
      // ============================
      if (user.role === "tl") {
        return res.json({
          role: "tl",
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image: user.profile_image,
          email: user.email,
        });
      }

      // ============================
      // ✅ EMPLOYEE LOGIN
      // ============================
      const checkQuery = `
        SELECT * FROM attendance
        WHERE LOWER(user) = LOWER(?)
        AND logout_time IS NULL
        ORDER BY login_time DESC
        LIMIT 1
      `;

      db.query(checkQuery, [username], (err3, result) => {
        if (err3) {
          return res.json({
            error: "DB error",
          });
        }

        if (result.length > 0) {
          return res.json({
            role: "employee",
            alreadyLoggedIn: true,
            data: result[0],
          });
        }

        // ============================
        // ✅ GET CURRENT MODE
        // ============================
        getActiveShiftSettings()
          .then((settings) => {
            const now = new Date();

            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const dayLoginMinutes = convertToMinutes(settings.day_login);

            const dayLogoutMinutes = convertToMinutes(settings.day_logout);

            let shift = "Morning";

            // ✅ NIGHT SHIFT
            if (currentMinutes >= dayLogoutMinutes || currentMinutes < 360) {
              shift = "Night";
            }

            // ============================
            // ✅ STATUS
            // ============================
            let logoutStatus = "Working";

            let allowedMinutes =
              shift === "Morning" ? dayLoginMinutes : dayLogoutMinutes;

            // ✅ LATE
            if (currentMinutes > allowedMinutes) {
              logoutStatus = "Late";
            }

            const loginTime = new Date();

            const insertQuery = `
            INSERT INTO attendance (
              user,
              login_time,
              shift,
              logout_status
            )
            VALUES (?, ?, ?, ?)
          `;

            db.query(
              insertQuery,
              [username, loginTime, shift, logoutStatus],
              (err5) => {
                if (err5) {
                  console.log(err5);

                  return res.json({
                    error: "Insert failed",
                  });
                }

                return res.json({
                  role: "employee",
                  alreadyLoggedIn: false,
                  user: username,
                  login_time: loginTime,
                  shift,
                  logoutStatus: logoutStatus,
                });
              },
            );
          })

          .catch(() => {
            return res.json({
              error: "Shift settings error",
            });
          });

        return;
      });
    });
  });
});

// ============================
// 🔐 LOGOUT
// ============================
app.post("/api/logout", (req, res) => {
  let { username } = req.body;

  console.log("🔥 LOGOUT API HIT:", username);

  if (!username) {
    return res.json({
      error: "Username missing",
    });
  }

  username = username.toLowerCase().trim();

  const findQuery = `
    SELECT * FROM attendance
    WHERE LOWER(user) = LOWER(?)
    AND logout_time IS NULL
    ORDER BY login_time DESC
    LIMIT 1
  `;

  db.query(findQuery, [username], (err, results) => {
    if (err) {
      return res.json({
        error: "DB error",
      });
    }

    if (results.length === 0) {
      return res.json({
        error: "No active session found",
      });
    }

    const record = results[0];

    const logoutTime = new Date();

    const hours = (logoutTime - new Date(record.login_time)) / (1000 * 60 * 60);

    let logoutStatus = "Normal Logout";

    // ✅ EARLY LOGOUT
    if (hours < 9) {
      logoutStatus = "Emergency Logout";
    }

    const updateQuery = `
      UPDATE attendance
      SET
        logout_time = ?,
        total_hours = ?,
        logout_status = ?
      WHERE id = ?
    `;

    db.query(
      updateQuery,
      [logoutTime, hours.toFixed(2), logoutStatus, record.id],
      (err2) => {
        if (err2) {
          console.log(err2);

          return res.json({
            error: "Update failed",
          });
        }

        res.json({
          message: "Logout successful",
        });
      },
    );
  });
});
// ============================
// 📊 TODAY STATUS
// ============================
app.post("/api/today", (req, res) => {
  let { username } = req.body;

  username = username?.toLowerCase().trim();

  const query = `
    SELECT * FROM attendance
    WHERE LOWER(user) = LOWER(?)
    ORDER BY login_time DESC
    LIMIT 1
  `;

  db.query(query, [username], (err, results) => {
    if (err) return res.json({ error: "DB error" });

    if (results.length === 0) {
      return res.json({
        message: "No record",
      });
    }

    res.json(results[0]);
  });
});

// ============================
// 👥 GET EMPLOYEES
// ============================
app.get("/api/employees", authMiddleware, (req, res) => {
  const query = `
    SELECT
      id,
      staff_id,
      first_name,
      last_name,
      email,
      role,
      department,
      phone,
      profile_image,
      is_active,
      created_at
    FROM users
    WHERE is_active = true
    ORDER BY id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.log(err);

      return res.json({
        error: "DB error",
      });
    }

    res.json(results);
  });
});

// ============================
// ➕ ADD EMPLOYEE
// ============================
app.post(
  "/api/employees",
  upload.single("profile_image"),
  authMiddleware,
  async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        email,
        password,
        role,
        department,
        phone,
      } = req.body;

      if (!first_name || !last_name || !email || !password) {
        return res.json({
          error: "Missing required fields",
        });
      }

      let profileImage = "";

      if (req.file) {
        profileImage = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
      }

      const checkQuery = `
        SELECT * FROM users
        WHERE LOWER(email)=LOWER(?)
      `;

      db.query(checkQuery, [email], async (err, existing) => {
        if (err) {
          return res.json({
            error: "DB error",
          });
        }

        if (existing.length > 0) {
          return res.json({
            error: "Email already exists",
          });
        }

        const countQuery = `
            SELECT COUNT(*) as total
            FROM users WHERE role = 'employee'
          `;

        db.query(countQuery, async (err2, countRes) => {
          if (err2) {
            return res.json({
              error: "DB error",
            });
          }

          const count = countRes[0].total + 1;

          const staff_id = `EMP${String(count).padStart(3, "0")}`;

          const hashedPassword = await bcrypt.hash(password, 10);

          const insertQuery = `
                INSERT INTO users (
                  staff_id,
                  first_name,
                  last_name,
                  email,
                  password,
                  role,
                  department,
                  phone,
                  profile_image
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;

          db.query(
            insertQuery,
            [
              staff_id,
              first_name,
              last_name,
              email.toLowerCase(),
              hashedPassword,
              role || "employee",
              department || "",
              phone || "",
              profileImage,
            ],
            (err3) => {
              if (err3) {
                console.log(err3);

                return res.json({
                  error: "Insert failed",
                });
              }

              res.json({
                message: "Employee added successfully",
              });
            },
          );
        });
      });
    } catch (err) {
      console.log(err);

      res.json({
        error: "Server error",
      });
    }
  },
);

// ============================
// ✏️ UPDATE EMPLOYEE
// ============================
app.put(
  "/api/employees/:id",
  authMiddleware,
  upload.single("profile_image"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const { first_name, last_name, department, phone } = req.body;

      let profileImage = null;

      if (req.file) {
        profileImage = `${process.env.BASE_URL}/uploads/${req.file.filename}`;
      }

      let query = `
        UPDATE users
        SET
          first_name = ?,
          last_name = ?,
          department = ?,
          phone = ?
      `;

      const params = [first_name, last_name, department, phone];

      if (profileImage) {
        query += `,
          profile_image = ?
        `;

        params.push(profileImage);
      }

      query += `
        WHERE id = ?
      `;

      params.push(id);

      db.query(query, params, (err) => {
        if (err) {
          console.log(err);

          return res.json({
            error: "Update failed",
          });
        }

        res.json({
          message: "Employee updated successfully",
        });
      });
    } catch (err) {
      console.log(err);

      res.json({
        error: "Server error",
      });
    }
  },
);

// ============================
// ❌ SOFT DELETE EMPLOYEE
// ============================
app.put("/api/employees/delete/:id", authMiddleware, (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE users
    SET is_active = false
    WHERE id = ?
  `;

  db.query(query, [id], (err) => {
    if (err) {
      console.log(err);

      return res.json({
        error: "DB error",
      });
    }

    res.json({
      message: "Employee removed successfully",
    });
  });
});

// ============================
// 📊 ATTENDANCE
// ============================
app.get("/api/attendance", authMiddleware, (req, res) => {
  const { staffId, fromDate, toDate, shift, page = 1, limit = 10 } = req.query;

  let baseQuery = `
    FROM attendance a
    LEFT JOIN users u
    ON LOWER(a.user) = LOWER(u.email)
    WHERE 1=1
  `;

  const params = [];

  // ✅ STAFF FILTER
  if (staffId) {
    baseQuery += " AND u.staff_id = ?";
    params.push(staffId);
  }

  // ✅ DATE RANGE FILTER
  if (fromDate && toDate) {
    baseQuery += `
      AND DATE(a.login_time)
      BETWEEN ? AND ?
    `;

    params.push(fromDate);
    params.push(toDate);
  }

  // ✅ SHIFT FILTER
  if (shift && shift !== "All") {
    baseQuery += " AND a.shift = ?";
    params.push(shift);
  }

  const offset = (page - 1) * limit;

  const dataQuery = `
    SELECT a.*, u.staff_id
    ${baseQuery}
    ORDER BY a.login_time DESC
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    ${baseQuery}
  `;

  db.query(countQuery, params, (err, countRes) => {
    if (err) {
      return res.json({
        error: "DB error",
      });
    }

    const total = countRes[0].total;

    const totalPages = Math.ceil(total / limit);

    db.query(
      dataQuery,
      [...params, parseInt(limit), parseInt(offset)],
      (err2, results) => {
        if (err2) {
          return res.json({
            error: "DB error",
          });
        }

        res.json({
          data: results,
          totalPages,
          total,
        });
      },
    );
  });
});

// ============================
// 📥 EXPORT
// ============================
app.get("/api/export", authMiddleware, (req, res) => {
  const { staffId, fromDate, toDate, shift } = req.query;

  let query = `
    SELECT
      a.*,
      u.staff_id,
      u.first_name,
      u.last_name
    FROM attendance a
    LEFT JOIN users u
    ON LOWER(a.user) = LOWER(u.email)
    WHERE 1=1
  `;

  const params = [];

  // ✅ STAFF FILTER
  if (staffId) {
    query += " AND u.staff_id = ?";
    params.push(staffId);
  }

  // ✅ DATE RANGE FILTER
  if (fromDate && toDate) {
    query += `
      AND DATE(a.login_time)
      BETWEEN ? AND ?
    `;

    params.push(fromDate);
    params.push(toDate);
  }

  // ✅ SHIFT FILTER
  if (shift && shift !== "All") {
    query += " AND a.shift = ?";
    params.push(shift);
  }

  query += `
    ORDER BY
      u.staff_id ASC,
      a.login_time ASC
  `;

  db.query(query, params, async (err, results) => {
    if (err) {
      console.log(err);

      return res.status(500).send("Export failed");
    }

    const workbook = new ExcelJS.Workbook();

    // ============================
    // ✅ GROUP EMPLOYEES
    // ============================
    const groupedEmployees = {};

    results.forEach((r) => {
      const key = r.staff_id || "UNKNOWN";

      if (!groupedEmployees[key]) {
        groupedEmployees[key] = [];
      }

      groupedEmployees[key].push(r);
    });

    // ============================
    // ✅ CREATE SHEETS
    // ============================
    Object.keys(groupedEmployees).forEach((staffKey) => {
      const employeeRecords = groupedEmployees[staffKey];

      const employeeName = employeeRecords[0]?.first_name || "";

      const sheetName = employeeName.substring(0, 31);

      const worksheet = workbook.addWorksheet(sheetName);

      // ============================
      // ✅ TITLE
      // ============================
      worksheet.mergeCells("A1:H1");

      const titleCell = worksheet.getCell("A1");

      titleCell.value = `${employeeName} Attendance Report`;

      titleCell.font = {
        bold: true,
        size: 16,
      };

      titleCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      // ============================
      // ✅ COLUMNS
      // ============================
      worksheet.columns = [
        {
          header: "Date",
          key: "date",
          width: 15,
        },
        {
          header: "Day",
          key: "day",
          width: 15,
        },
        {
          header: "Shift",
          key: "shift",
          width: 15,
        },
        {
          header: "Login Time",
          key: "login",
          width: 18,
        },
        {
          header: "Logout Time",
          key: "logout",
          width: 18,
        },
        {
          header: "Total Hours",
          key: "hours",
          width: 15,
        },
        {
          header: "Status",
          key: "status",
          width: 25,
        },
      ];

      // ============================
      // ✅ HEADER ROW
      // ============================
      const headerRow = worksheet.getRow(3);

      headerRow.values = [
        "Date",
        "Day",
        "Shift",
        "Login Time",
        "Logout Time",
        "Total Hours",
        "Status",
      ];

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: {
            argb: "FFFFFFFF",
          },
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "4F46E5",
          },
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // ============================
      // ✅ SORT ASCENDING DATE
      // ============================
      employeeRecords.sort(
        (a, b) => new Date(a.login_time) - new Date(b.login_time),
      );

      // ============================
      // ✅ ATTENDANCE DATA
      // ============================
      employeeRecords.forEach((r) => {
        // ✅ HUMAN READABLE HOURS
        const totalHours = parseFloat(r.total_hours || 0);

        const hrs = Math.floor(totalHours);

        const mins = Math.round((totalHours - hrs) * 60);

        let readableHours = "0 mins";

        if (hrs === 0) {
          readableHours = `${mins} mins`;
        } else if (mins === 0) {
          readableHours = `${hrs} hrs`;
        } else {
          readableHours = `${hrs} hrs ${mins} mins`;
        }

        const isOff = r.logout_status === "Off";

        const loginDisplay = isOff
          ? "OFF"
          : new Date(r.login_time).toLocaleTimeString();

        const logoutDisplay = isOff
          ? "OFF"
          : r.logout_time
            ? new Date(r.logout_time).toLocaleTimeString()
            : "-";

        const statusDisplay = isOff ? "OFF" : r.logout_status || "Normal";

        const row = worksheet.addRow({

          date: new Date(r.login_time).toLocaleDateString(),

          day: new Date(r.login_time).toLocaleDateString("en-US", {
            weekday: "long",
          }),

          shift: r.shift,

          login: loginDisplay,

          logout: logoutDisplay,

          // ✅ UPDATED HOURS FORMAT
          hours: isOff ? "Off" : readableHours,

          status: statusDisplay,
        });

        row.eachCell((cell) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
          };

          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // ============================
        // ✅ OFF → FULL RED ROW
        // ============================
        if (r.logout_status === "Off") {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: "FFCCCC",
              },
            };

            cell.font = {
              bold: true,
              color: {
                argb: "FF0000",
              },
            };
          });
        }

        // ============================
        // ✅ EMERGENCY → STATUS ONLY
        // ============================
        if (r.logout_status === "Emergency Logout") {
          const statusCell = row.getCell(7);

          statusCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "FFFF00",
            },
          };

          statusCell.font = {
            bold: true,
          };
        }
      });

      // ============================
// ✅ EMPLOYEE SUMMARY
// ============================

const totalDays = employeeRecords.length;

const offDays = employeeRecords.filter(
  (r) => r.logout_status === "Off"
).length;

const emergencyDays = employeeRecords.filter(
  (r) => r.logout_status === "Emergency Logout"
).length;

const presentDays =
  totalDays - offDays;

const totalWorkedHours =
  employeeRecords.reduce((sum, r) => {
    return sum + parseFloat(r.total_hours || 0);
  }, 0);

const avgHours =
  totalDays > 0
    ? (totalWorkedHours / totalDays).toFixed(1)
    : 0;

const summaryStartRow =
  worksheet.rowCount + 3;

// TITLE
worksheet.mergeCells(
  `A${summaryStartRow}:D${summaryStartRow}`
);

const summaryTitle =
  worksheet.getCell(`A${summaryStartRow}`);

summaryTitle.value =
  "Employee Summary";

summaryTitle.font = {
  bold: true,
  size: 14,
};

summaryTitle.alignment = {
  horizontal: "center",
};

// DATA
const summaryData = [
  ["Total Days", totalDays],
  ["Present", presentDays],
  ["OFF", offDays],
  ["Emergency Logout", emergencyDays],
  ["Avg Hours", `${avgHours} hrs`],
];

summaryData.forEach((item) => {
  const row = worksheet.addRow(item);

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };

    cell.alignment = {
      horizontal: "center",
    };
  });
});

      // ============================
      // ✅ OFF SUMMARY TABLE
      // ONLY EMP001 SHEET
      // ============================
      if (staffKey === "EMP001") {
        const startRow = worksheet.rowCount + 4;

        // ✅ TITLE
        const summaryTitle = worksheet.getCell(`A${startRow}`);

        summaryTitle.value = "Monthly OFF Summary";

        summaryTitle.font = {
          bold: true,
          size: 14,
        };

        // ✅ HEADER
        const summaryHeader = worksheet.getRow(startRow + 1);

        summaryHeader.values = ["EMP Code", "Name", "Total OFF"];

        summaryHeader.eachCell((cell) => {
          cell.font = {
            bold: true,
            color: {
              argb: "FFFFFFFF",
            },
          };

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
              argb: "4F46E5",
            },
          };

          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
          };

          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });

        // ✅ DATA
        Object.keys(groupedEmployees).forEach((empKey) => {
          const empRecords = groupedEmployees[empKey];

          const offCount = empRecords.filter(
            (r) => r.logout_status === "Off",
          ).length;

          const empName = empRecords[0]?.first_name || "";

          const summaryRow = worksheet.addRow([empKey, empName, offCount]);

          summaryRow.eachCell((cell) => {
            cell.alignment = {
              horizontal: "center",
              vertical: "middle",
            };

            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });
      }
    });

    // ============================
    // ✅ FILE NAME
    // ============================
    let fileName = "attendance_report.xlsx";

    if (fromDate && toDate) {
      fileName = `attendance_${fromDate}_to_${toDate}.xlsx`;
    }

    // ============================
    // ✅ RESPONSE HEADERS
    // ============================
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // ============================
    // ✅ SEND FILE
    // ============================
    await workbook.xlsx.write(res);

    res.end();
  });
});

app.listen(process.env.PORT, () => {
  console.log("🚀 Server running on http://127.0.0.1:8000");
});
