import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

function TLDashboard() {
  const [records, setRecords] = useState([]);
  const [date, setDate] = useState("");
  const [shift, setShift] = useState("");
  const [staffId, setStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [isFiltered, setIsFiltered] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [page, setPage] = useState(1);
  const limit = 10;

  const intervalRef = useRef(null);
  const navigate = useNavigate();

  // ============================
  // 📡 FETCH (MAIN)
  // ============================
  const fetchAttendance = async (showLoader = false) => {
  if (showLoader) setLoading(true);

  try {
    const res = await fetch(
      `http://127.0.0.1:8000/api/attendance?page=${page}&limit=${limit}`
    );
    const data = await res.json();

    console.log("MAIN DATA:", data);

    // ✅ SAFE DATA HANDLING
    const recordsData = Array.isArray(data)
      ? data
      : data?.data || [];

    // ✅ FIX: CALCULATE TOTAL PAGES PROPERLY
    const totalRecords = data?.total || recordsData.length || 0;

    const pages = data?.totalPages
      ? data.totalPages
      : Math.ceil(totalRecords / limit) || 1;

    setRecords(recordsData);
    setTotalPages(pages);

  } catch (err) {
    console.log(err);
    setRecords([]);
    setTotalPages(1);
  }

  if (showLoader) setLoading(false);
};
  // ============================
  // 📊 FILTER FETCH
  // ============================
  const fetchFilteredAttendance = async () => {
  setLoading(true);

  let url = `http://127.0.0.1:8000/api/attendance?page=${page}&limit=${limit}&`;

  if (staffId) url += `staffId=${staffId}&`;
  if (date) url += `date=${date}&`;
  if (shift) url += `shift=${shift}&`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    console.log("FILTER DATA:", data);

    // ✅ SAFE DATA HANDLING
    const recordsData = Array.isArray(data)
      ? data
      : data?.data || [];

    // ✅ FIX: CALCULATE TOTAL PAGES PROPERLY
    const totalRecords = data?.total || recordsData.length || 0;

    const pages = data?.totalPages
      ? data.totalPages
      : Math.ceil(totalRecords / limit) || 1;

    setRecords(recordsData);
    setTotalPages(pages);

  } catch (err) {
    console.log(err);
    setRecords([]);
    setTotalPages(1);
  }

  setLoading(false);
};
  // ============================
  // 🔐 AUTH + AUTO REFRESH
  // ============================
  useEffect(() => {
    const role = sessionStorage.getItem("role");

    if (role === "tl") {
      setAuthorized(true);

      if (isFiltered) {
        fetchFilteredAttendance();
      } else {
        fetchAttendance(true);
      }

      intervalRef.current = setInterval(() => {
        if (!isFiltered) fetchAttendance(false);
      }, 30000);

    } else {
      navigate("/");
    }

    return () => clearInterval(intervalRef.current);
  }, [navigate, isFiltered, page]);

  const handleLogout = () => {
    sessionStorage.removeItem("role");
    navigate("/");
  };

  // ============================
  // 🔍 FILTER ACTIONS
  // ============================
  const handleApplyFilter = () => {
    setPage(1);
    setIsFiltered(true);
  };

  const handleResetFilter = () => {
    setIsFiltered(false);
    setStaffId("");
    setDate("");
    setShift("");
    setPage(1);
  };

  // ============================
  // 📥 DOWNLOAD
  // ============================
  const handleDownload = async () => {
    let url = "http://127.0.0.1:8000/api/export?";

    if (staffId) url += `staffId=${staffId}&`;
    if (date) url += `date=${date}&`;
    if (shift) url += `shift=${shift}&`;

    const res = await fetch(url);
    const blob = await res.blob();

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "attendance.xlsx";
    link.click();
  };

  if (!authorized) return null;

  // ============================
  // 🔥 LIVE HOURS
  // ============================
  const getLiveHours = (rec) => {
    if (!rec.logout_time) {
      const now = new Date();
      const login = new Date(rec.login_time);
      return ((now - login) / (1000 * 60 * 60)).toFixed(2);
    }
    return rec.total_hours || 0;
  };

  const getHoursColor = (hours) => {
    if (hours > 12) return "text-red-600 font-bold";
    if (hours > 9) return "text-green-600 font-semibold";
    if (hours >= 4) return "text-yellow-500 font-semibold";
    return "";
  };

  const checkLate = (rec) => {
    const login = new Date(rec.login_time);
    const h = login.getHours();
    const m = login.getMinutes();

    if (rec.shift === "Day") {
      return h > 10 || (h === 10 && m > 30);
    }

    if (rec.shift === "Night") {
      return h > 19 || (h === 19 && m > 0);
    }

    return false;
  };

  const checkShiftViolation = (rec) => {
    const hour = new Date(rec.login_time).getHours();

    if (rec.shift === "Day" && (hour < 6 || hour >= 18)) return true;
    if (rec.shift === "Night" && hour >= 6 && hour < 18) return true;

    return false;
  };

  // ============================
  // 📊 STATS
  // ============================
  const totalEmployees = new Set(records.map(r => r.user)).size;
  const activeNow = records.filter(r => !r.logout_time).length;
  const totalRecords = records.length;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* HEADER */}
      <div className="bg-white shadow p-4 flex justify-between">
        <h1 className="text-2xl font-bold">TL Dashboard</h1>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* STATS */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <p>Total Employees</p>
            <h2 className="text-xl font-bold">{totalEmployees}</h2>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p>Active Now</p>
            <h2 className="text-xl font-bold">{activeNow}</h2>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <p>Total Records</p>
            <h2 className="text-xl font-bold">{totalRecords}</h2>
          </div>
        </div>

        {/* FILTER */}
        <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3 items-center">

          <input
            type="text"
            placeholder="Staff ID"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="border p-2 rounded w-40"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border p-2 rounded"
          />

          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All Shift</option>
            <option value="Day">Day</option>
            <option value="Night">Night</option>
          </select>

          <button
            onClick={handleApplyFilter}
            className="bg-indigo-600 text-white px-4 py-2 rounded"
          >
            Apply
          </button>

          <button
            onClick={handleResetFilter}
            className="bg-gray-300 px-4 py-2 rounded"
          >
            Reset
          </button>

          <button
            onClick={handleDownload}
            className="bg-green-600 text-white px-4 py-2 rounded ml-auto"
          >
            Download
          </button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="p-3">Staff ID</th>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3">Date</th>
                <th className="p-3">Shift</th>
                <th className="p-3">Login</th>
                <th className="p-3">Logout</th>
                <th className="p-3">Hours</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {Array.isArray(records) && records.map((rec, i) => {
                const hours = parseFloat(getLiveHours(rec));
                const isWorking = !rec.logout_time;

                return (
                  <tr key={i} className="border-b">
                    <td className="p-3 text-center">{rec.staff_id || "-"}</td>

                    <td className="p-3 flex items-center gap-2">
                      {rec.user}
                      {isWorking && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                          ● Working
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {new Date(rec.login_time).toLocaleDateString()}
                    </td>

                    <td className="p-3 text-center">{rec.shift}</td>

                    <td className="p-3 text-green-600 text-center">
                      {new Date(rec.login_time).toLocaleTimeString()}
                    </td>

                    <td className="p-3 text-red-500 text-center">
                      {rec.logout_time
                        ? new Date(rec.logout_time).toLocaleTimeString()
                        : "—"}
                    </td>

                    <td className={`p-3 text-center ${getHoursColor(hours)}`}>
                      {hours} hrs
                    </td>

                    <td className="p-3 text-center">
                      {checkShiftViolation(rec) ? (
                        <span className="text-red-600 font-bold">Invalid</span>
                      ) : checkLate(rec) ? (
                        <span className="text-yellow-600 font-semibold">Late</span>
                      ) : (
                        <span className="text-green-600">Normal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
<div className="flex justify-center items-center gap-4 mt-4">

  <button
    onClick={() => setPage((p) => Math.max(p - 1, 1))}
    disabled={page === 1}
    className={`px-4 py-2 rounded ${
      page === 1
        ? "bg-gray-200 cursor-not-allowed"
        : "bg-gray-300 hover:bg-gray-400"
    }`}
  >
    Prev
  </button>

  <span className="px-4 py-2 font-semibold">
    Page {page} of {totalPages}
  </span>

  <button
    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
    disabled={page >= totalPages}
    className={`px-4 py-2 rounded ${
      page >= totalPages
        ? "bg-gray-200 cursor-not-allowed"
        : "bg-gray-300 hover:bg-gray-400"
    }`}
  >
    Next
  </button>

</div>

      </div>
    </div>
  );
}

export default TLDashboard;