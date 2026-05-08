const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const ExcelJS = require("exceljs");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ STATIC UPLOADS
app.use("/uploads", express.static("uploads"));

// ✅ DB CONNECTION
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "APTdbtl@2026",
  database: "attendance_db",
});

db.connect((err) => {
  if (err) console.log("❌ DB ERROR:", err);
  else console.log("✅ MySQL Connected");
});

// ============================
// 📸 MULTER STORAGE
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueName +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
});

// ============================
// 🌍 SHIFT
// ============================
const getShift = (timezone = "Asia/Kolkata") => {
  const now = new Date();

  const localTime = new Date(
    now.toLocaleString("en-US", {
      timeZone: timezone,
    })
  );

  const hour = localTime.getHours();

  return hour >= 6 && hour < 18
    ? "Day"
    : "Night";
};

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
    if (err) return res.json({ error: "DB error" });

    if (users.length === 0) {
      return res.json({
        error: "User not found",
      });
    }

    const user = users[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        return res.json({
          error: "Server error",
        });
      }

      if (!isMatch) {
        return res.json({
          error: "Invalid password",
        });
      }

      // ✅ TL LOGIN
      if (user.role === "tl") {
        return res.json({
          role: "tl",
          first_name: user.first_name,
          last_name: user.last_name,
          profile_image: user.profile_image,
          email: user.email,
        });
      }

      // ✅ EMPLOYEE LOGIN
      const checkQuery = `
        SELECT * FROM attendance
        WHERE LOWER(user) = LOWER(?)
        AND logout_time IS NULL
        ORDER BY login_time DESC
        LIMIT 1
      `;

      db.query(checkQuery, [username], (err2, result) => {
        if (err2) {
          return res.json({ error: "DB error" });
        }

        if (result.length > 0) {
          return res.json({
            role: "employee",
            alreadyLoggedIn: true,
            data: result[0],
          });
        }

        const shift = getShift(timezone);
        const loginTime = new Date();

        const insertQuery = `
          INSERT INTO attendance (
            user,
            login_time,
            shift
          )
          VALUES (?, ?, ?)
        `;

        db.query(
          insertQuery,
          [username, loginTime, shift],
          (err3) => {
            if (err3) {
              return res.json({
                error: "Insert failed",
              });
            }

            return res.json({
              role: "employee",
              alreadyLoggedIn: false,
              user: username,
              login_time: loginTime,
            });
          }
        );
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
    if (err) return res.json({ error: "DB error" });

    if (results.length === 0) {
      return res.json({
        error: "No active session found",
      });
    }

    const record = results[0];
    const logoutTime = new Date();

    const hours =
      (logoutTime - new Date(record.login_time)) /
      (1000 * 60 * 60);

    const updateQuery = `
      UPDATE attendance
      SET logout_time = ?, total_hours = ?
      WHERE id = ?
    `;

    db.query(
      updateQuery,
      [logoutTime, hours.toFixed(2), record.id],
      (err2) => {
        if (err2) {
          return res.json({
            error: "Update failed",
          });
        }

        res.json({
          message: "Logout successful",
        });
      }
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
app.get("/api/employees", (req, res) => {
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

      if (
        !first_name ||
        !last_name ||
        !email ||
        !password
      ) {
        return res.json({
          error: "Missing required fields",
        });
      }

      let profileImage = "";

      if (req.file) {
        profileImage =
          `http://127.0.0.1:8000/uploads/${req.file.filename}`;
      }

      const checkQuery = `
        SELECT * FROM users
        WHERE LOWER(email)=LOWER(?)
      `;

      db.query(
        checkQuery,
        [email],
        async (err, existing) => {

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
            FROM users
          `;

          db.query(
            countQuery,
            async (err2, countRes) => {

              if (err2) {
                return res.json({
                  error: "DB error",
                });
              }

              const count =
                countRes[0].total + 1;

              const staff_id =
                `EMP${String(count).padStart(3, "0")}`;

              const hashedPassword =
                await bcrypt.hash(password, 10);

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
                    message:
                      "Employee added successfully",
                  });

                }
              );
            }
          );
        }
      );

    } catch (err) {

      console.log(err);

      res.json({
        error: "Server error",
      });

    }
  }
);

// ============================
// ✏️ UPDATE EMPLOYEE
// ============================
app.put(
  "/api/employees/:id",
  upload.single("profile_image"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        first_name,
        last_name,
        department,
        phone,
      } = req.body;

      let profileImage = null;

      if (req.file) {
        profileImage =
          `http://127.0.0.1:8000/uploads/${req.file.filename}`;
      }

      let query = `
        UPDATE users
        SET
          first_name = ?,
          last_name = ?,
          department = ?,
          phone = ?
      `;

      const params = [
        first_name,
        last_name,
        department,
        phone,
      ];

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
          message:
            "Employee updated successfully",
        });
      });

    } catch (err) {
      console.log(err);

      res.json({
        error: "Server error",
      });
    }
  }
);

// ============================
// ❌ SOFT DELETE EMPLOYEE
// ============================
app.put("/api/employees/delete/:id", (req, res) => {
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
app.get("/api/attendance", (req, res) => {
  const {
    staffId,
    fromDate,
    toDate,
    shift,
    page = 1,
    limit = 10,
  } = req.query;

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

    const totalPages =
      Math.ceil(total / limit);

    db.query(
      dataQuery,
      [
        ...params,
        parseInt(limit),
        parseInt(offset),
      ],
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
      }
    );
  });
});

// ============================
// 📥 EXPORT
// ============================
app.get("/api/export", (req, res) => {

  const {
    staffId,
    fromDate,
    toDate,
    shift,
  } = req.query;

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
      a.login_time DESC
  `;

  db.query(query, params, async (err, results) => {

    if (err) {
      console.log(err);

      return res
        .status(500)
        .send("Export failed");
    }

    const workbook =
      new ExcelJS.Workbook();

    // ✅ GROUP EMPLOYEES
    const groupedEmployees = {};

    results.forEach((r) => {

      const key =
        r.staff_id || "UNKNOWN";

      if (!groupedEmployees[key]) {
        groupedEmployees[key] = [];
      }

      groupedEmployees[key].push(r);
    });

    // ✅ CREATE SEPARATE SHEETS
    Object.keys(groupedEmployees).forEach(
      (staffKey) => {

        const employeeRecords =
          groupedEmployees[staffKey];

        const employeeName =
          `${employeeRecords[0]?.first_name || ""}
          ${employeeRecords[0]?.last_name || ""}`
          .trim();

        const sheetName =
          `${staffKey}`.substring(0, 31);

        const worksheet =
          workbook.addWorksheet(sheetName);

        worksheet.columns = [
          {
            header: "Staff ID",
            key: "staff_id",
            width: 15,
          },
          {
            header: "Employee",
            key: "employee",
            width: 30,
          },
          {
            header: "Date",
            key: "date",
            width: 18,
          },
          {
            header: "Shift",
            key: "shift",
            width: 15,
          },
          {
            header: "Login Time",
            key: "login",
            width: 20,
          },
          {
            header: "Logout Time",
            key: "logout",
            width: 20,
          },
          {
            header: "Total Hours",
            key: "hours",
            width: 15,
          },
        ];

        // ✅ HEADER STYLE
        worksheet.getRow(1).font = {
          bold: true,
        };

        // ✅ ROWS
        employeeRecords.forEach((r) => {

          worksheet.addRow({
            staff_id:
              r.staff_id || "-",

            employee:
              employeeName || r.user,

            date: new Date(
              r.login_time
            ).toLocaleDateString(),

            shift: r.shift,

            login: new Date(
              r.login_time
            ).toLocaleTimeString(),

            logout: r.logout_time
              ? new Date(
                  r.logout_time
                ).toLocaleTimeString()
              : "-",

            hours:
              r.total_hours || 0,
          });
        });
      }
    );

    // ✅ FILE NAME
    let fileName =
      "attendance_report.xlsx";

    if (fromDate && toDate) {
      fileName =
        `attendance_${fromDate}_to_${toDate}.xlsx`;
    }

    // ✅ RESPONSE HEADERS
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${fileName}`
    );

    // ✅ SEND FILE
    await workbook.xlsx.write(res);

    res.end();
  });
});

app.listen(8000, () => {
  console.log(
    "🚀 Server running on http://127.0.0.1:8000"
  );
});