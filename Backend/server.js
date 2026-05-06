const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const ExcelJS = require("exceljs");
const bcrypt = require("bcrypt");

const app = express();

app.use(cors());
app.use(express.json());

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
// 🌍 SHIFT
// ============================
const getShift = (timezone = "Asia/Kolkata") => {
  const now = new Date();
  const localTime = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );

  const hour = localTime.getHours();
  return hour >= 6 && hour < 18 ? "Day" : "Night";
};

// ============================
// 🔐 LOGIN
// ============================
app.post("/api/login", (req, res) => {
  let { username, password, timezone } = req.body;

  console.log("🔥 LOGIN API HIT:", username);

  if (!username || !password) {
    return res.json({ error: "Missing credentials" });
  }

  username = username.toLowerCase().trim();

  const userQuery = `SELECT * FROM users WHERE LOWER(email) = LOWER(?)`;

  db.query(userQuery, [username], (err, users) => {
    if (err) return res.json({ error: "DB error" });

    if (users.length === 0) {
      return res.json({ error: "User not found" });
    }

    const user = users[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.json({ error: "Server error" });

      if (!isMatch) {
        return res.json({ error: "Invalid password" });
      }

      // ✅ TL LOGIN
      if (user.role === "tl") {
        return res.json({ role: "tl" });
      }

      // ============================
      // EMPLOYEE LOGIN
      // ============================
      const checkQuery = `
        SELECT * FROM attendance
        WHERE LOWER(user) = LOWER(?) AND logout_time IS NULL
        ORDER BY login_time DESC
        LIMIT 1
      `;

      db.query(checkQuery, [username], (err2, result) => {
        if (err2) return res.json({ error: "DB error" });

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
          INSERT INTO attendance (user, login_time, shift)
          VALUES (?, ?, ?)
        `;

        db.query(insertQuery, [username, loginTime, shift], (err3) => {
          if (err3) return res.json({ error: "Insert failed" });

          return res.json({
            role: "employee",
            alreadyLoggedIn: false,
            user: username,
            login_time: loginTime,
          });
        });
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
    return res.json({ error: "Username missing" });
  }

  username = username.toLowerCase().trim();

  const findQuery = `
    SELECT * FROM attendance
    WHERE LOWER(user) = LOWER(?) AND logout_time IS NULL
    ORDER BY login_time DESC
    LIMIT 1
  `;

  db.query(findQuery, [username], (err, results) => {
    if (err) return res.json({ error: "DB error" });

    if (results.length === 0) {
      return res.json({ error: "No active session found" });
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
        if (err2) return res.json({ error: "Update failed" });

        res.json({ message: "Logout successful" });
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
      return res.json({ message: "No record" });
    }

    res.json(results[0]);
  });
});

// ============================
// 📊 ATTENDANCE (🔥 FINAL FIX)
// ============================
app.get("/api/attendance", (req, res) => {
  const { staffId, date, shift, page = 1, limit = 10 } = req.query;

  let baseQuery = `
    FROM attendance a
    LEFT JOIN users u ON LOWER(a.user) = LOWER(u.email)
    WHERE 1=1
  `;

  const params = [];

  if (staffId) {
    baseQuery += " AND u.staff_id = ?";
    params.push(staffId);
  }

  if (date) {
    baseQuery += " AND DATE(a.login_time) = ?";
    params.push(date);
  }

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

  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

  db.query(countQuery, params, (err, countRes) => {
    if (err) return res.json({ error: "DB error" });

    const total = countRes[0].total;
    const totalPages = Math.ceil(total / limit);

    db.query(
      dataQuery,
      [...params, parseInt(limit), parseInt(offset)],
      (err2, results) => {
        if (err2) return res.json({ error: "DB error" });

        res.json({
          data: results,
          totalPages: totalPages,
        });
      }
    );
  });
});

// ============================
// 📥 EXPORT
// ============================
app.get("/api/export", (req, res) => {
  let query = `
    SELECT a.*, u.staff_id
    FROM attendance a
    LEFT JOIN users u ON LOWER(a.user) = LOWER(u.email)
    WHERE 1=1
  `;

  db.query(query, [], async (err, results) => {
    if (err) return res.status(500).send("Error");

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendance");

    worksheet.columns = [
      { header: "Staff ID", key: "staff_id" },
      { header: "Employee", key: "user" },
      { header: "Date", key: "date" },
      { header: "Shift", key: "shift" },
      { header: "Login", key: "login" },
      { header: "Logout", key: "logout" },
      { header: "Hours", key: "hours" },
    ];

    results.forEach((r) => {
      worksheet.addRow({
        staff_id: r.staff_id || "-",
        user: r.user,
        date: new Date(r.login_time).toLocaleDateString(),
        shift: r.shift,
        login: new Date(r.login_time).toLocaleTimeString(),
        logout: r.logout_time
          ? new Date(r.logout_time).toLocaleTimeString()
          : "-",
        hours: r.total_hours || 0,
      });
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  });
});

app.listen(8000, () => {
  console.log("🚀 Server running on http://127.0.0.1:8000");
});