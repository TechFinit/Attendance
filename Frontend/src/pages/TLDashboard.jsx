import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function TLDashboard() {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const fetchAttendance = async (selectedMonth = "") => {
    setLoading(true);

    let url = "http://127.0.0.1:8000/api/attendance/";
    if (selectedMonth) url += `?month=${selectedMonth}`;

    const res = await fetch(url);
    const data = await res.json();

    setRecords(data);
    setLoading(false);
  };

  // 🔐 Role Protection
  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role !== "tl") {
      alert("Access Denied ❌");
      navigate("/");
    } else {
      fetchAttendance();
    }
  }, [navigate]);

  const handleDownload = async () => {
    let url = "http://127.0.0.1:8000/api/download/";
    if (month) url += `?month=${month}`;

    const res = await fetch(url);
    const blob = await res.blob();

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "employee_attendance.xlsx";
    link.click();
  };

  const handleLogout = () => {
    localStorage.removeItem("role");
    navigate("/");
  };

  // 📊 Stats
  const totalEmployees = new Set(records.map(r => r.user)).size;
  const activeNow = records.filter(r => !r.logout_time).length;
  const totalRecords = records.length;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* 🔥 HEADER */}
      <div className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">
          TL Dashboard
        </h1>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
          >
            Download Excel
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* 📊 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total Employees</p>
            <h2 className="text-2xl font-bold text-indigo-600">
              {totalEmployees}
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Active Now</p>
            <h2 className="text-2xl font-bold text-green-600">
              {activeNow}
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow">
            <p className="text-gray-500 text-sm">Total Records</p>
            <h2 className="text-2xl font-bold text-blue-600">
              {totalRecords}
            </h2>
          </div>

        </div>

        {/* 🎯 FILTER */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-3 items-center">

          <select
            onChange={(e) => setMonth(e.target.value)}
            className="border p-2 rounded-lg"
          >
            <option value="">All Months</option>
            {[...Array(12)].map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>

          <button
            onClick={() => fetchAttendance(month)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            Apply Filter
          </button>

        </div>

        {/* 📋 TABLE */}
        <div className="bg-white rounded-xl shadow overflow-hidden">

          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Loading data...
            </div>
          ) : records.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No records found
            </div>
          ) : (
            <table className="w-full text-sm">

              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Shift</th>
                  <th className="p-3">Login</th>
                  <th className="p-3">Logout</th>
                  <th className="p-3">Hours</th>
                </tr>
              </thead>

              <tbody>
                {records.map((rec, index) => (
                  <tr
                    key={index}
                    className="border-b hover:bg-gray-50 transition"
                  >
                    <td className="p-3 font-medium">
                      {rec.user}
                    </td>

                    <td className="p-3 text-center">
                      {new Date(rec.date).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          rec.shift === "Night"
                            ? "bg-purple-100 text-purple-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {rec.shift}
                      </span>
                    </td>

                    <td className="p-3 text-green-600 text-center">
                      {new Date(rec.login_time).toLocaleTimeString()}
                    </td>

                    <td className="p-3 text-red-500 text-center">
                      {rec.logout_time
                        ? new Date(rec.logout_time).toLocaleTimeString()
                        : "—"}
                    </td>

                    <td className="p-3 text-center font-semibold text-blue-600">
                      {rec.total_hours} hrs
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}
        </div>

      </div>
    </div>
  );
}

export default TLDashboard;