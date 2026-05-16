import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config/api";
import Sidebar from "./Sidebar";
import EmployeeManagement from "./EmployeeManagement";

function TLDashboard() {
  const [records, setRecords] = useState([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [shift, setShift] = useState("");
  const [staffId, setStaffId] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [isFiltered, setIsFiltered] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  // NEW
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [tlData, setTlData] = useState({
    first_name: "",
    last_name: "",
    profile_image: "",
  });

  const [page, setPage] = useState(1);
  const limit = 10;

  const intervalRef = useRef(null);

  const navigate = useNavigate();

  // ============================
  // 📡 FETCH ATTENDANCE
  // ============================
  const fetchAttendance = async (
    showLoader = false
  ) => {
    if (showLoader) setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/attendance?page=${page}&limit=${limit}`
      );

      const data = await res.json();

      const recordsData = Array.isArray(data)
        ? data
        : data?.data || [];

      const totalRecords =
        data?.total || recordsData.length || 0;

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

    let url =
      `${API_URL}/api/attendance?page=${page}&limit=${limit}&`;

    if (staffId) {
      url += `staffId=${staffId}&`;
    }

    if (fromDate) {
      url += `fromDate=${fromDate}&`;
    }

    if (toDate) {
      url += `toDate=${toDate}&`;
    }

    if (shift) {
      url += `shift=${shift}&`;
    }

    try {
      const res = await fetch(url);

      const data = await res.json();

      const recordsData = Array.isArray(data)
        ? data
        : data?.data || [];

      const totalRecords =
        data?.total || recordsData.length || 0;

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
  // 🔐 AUTH
  // ============================
  useEffect(() => {

    const role =
      sessionStorage.getItem("role");

    // ✅ ALLOW TL + ADMIN
    if (role === "tl" || role === "admin") {
      setAuthorized(true);

      // ✅ PROFILE DATA
      const tlProfile = {

        first_name:
          sessionStorage.getItem(
            "tl_first_name"
          ),

        last_name:
          sessionStorage.getItem(
            "tl_last_name"
          ),

        profile_image:
          sessionStorage.getItem(
            "tl_profile_image"
          ),
      };

      setTlData(tlProfile);

      // ✅ FETCH DATA
      if (isFiltered) {

        fetchFilteredAttendance();

      } else {

        fetchAttendance(true);

      }

      // ✅ AUTO REFRESH
      intervalRef.current =
        setInterval(() => {

          if (!isFiltered) {
            fetchAttendance(false);
          }

        }, 30000);

    }

    // ❌ UNAUTHORIZED
    else {

      navigate("/");

    }

    // ✅ CLEANUP
    return () =>
      clearInterval(intervalRef.current);

  }, [navigate, isFiltered, page, fromDate, toDate, shift, staffId]);

  // ============================
  // 🔐 LOGOUT
  // ============================
  const handleLogout = () => {
    sessionStorage.removeItem("role");

    sessionStorage.removeItem("tl_first_name");
    sessionStorage.removeItem("tl_last_name");
    sessionStorage.removeItem("tl_profile_image");

    navigate("/");
  };

  // ============================
  // 🔍 FILTER
  // ============================
  const handleApplyFilter = () => {
    setPage(1);
    setIsFiltered(true);
  };

  const handleResetFilter = () => {
    setIsFiltered(false);

    setStaffId("");
    setFromDate("");
    setToDate("");
    setShift("");

    setPage(1);
  };

  // ============================
  // 📥 DOWNLOAD
  // ============================
  const handleDownload = async () => {
    let url =
      `${API_URL}/api/export?`;

    if (staffId) {
      url += `staffId=${staffId}&`;
    }

    if (fromDate) {
      url += `fromDate=${fromDate}&`;
    }

    if (toDate) {
      url += `toDate=${toDate}&`;
    }

    if (shift) {
      url += `shift=${shift}&`;
    }

    const res = await fetch(url);

    const blob = await res.blob();

    const link =
      document.createElement("a");

    link.href =
      window.URL.createObjectURL(blob);

    link.download = "attendance.xlsx";

    link.click();
  };

  if (!authorized) return null;

  // ============================
  // 🔥 LIVE HOURS
  // ============================
  const getLiveHours = (rec) => {
    let totalHours = 0;
    if (!rec.logout_time) {
      const now = new Date();

      const login = new Date(
        rec.login_time
      );

      totalHours =
        (now - login) /
        (1000 * 60 * 60)
    } else {
      totalHours =
        parseFloat(rec.total_hours || 0);
    }

    // ✅ CONVERT TO HOURS + MINUTES
    const hours = Math.floor(totalHours);

    const minutes = Math.round(
      (totalHours - hours) * 60
    );

    // ✅ ONLY MINUTES
    if (hours === 0) {
      return `${minutes} mins`;
    }

    return `${hours}h ${minutes}m`;
  };

  const getHoursColor = (hours) => {
    if (hours > 12)
      return "text-red-600 font-bold";

    if (hours > 9)
      return "text-green-600 font-semibold";

    if (hours >= 4)
      return "text-yellow-500 font-semibold";

    return "";
  };

  const checkLate = (rec) => {

    // ✅ If already marked as Late from backend
    if (rec.logout_status === "Late") {
      return true;
    }

    const login = new Date(rec.login_time);

    const h = login.getHours();
    const m = login.getMinutes();

    // ✅ MORNING SHIFT
    if (rec.shift === "Morning") {

      // DST → 10 AM
      // GMT → 11 AM
      // Backend already handles exact logic

      return h > 10 || (h === 10 && m > 0);
    }

    // ✅ NIGHT SHIFT
    if (rec.shift === "Night") {

      return h > 19 || (h === 19 && m > 0);
    }

    return false;
  };

  const checkShiftViolation = (rec) => {

    // ✅ Ignore completed sessions
    if (rec.logout_time) {
      return false;
    }

    const shift =
      rec.shift?.toLowerCase();

    // ✅ USE UTC HOURS
    const hour =
      new Date(rec.login_time).getUTCHours();

    // ✅ MORNING
    if (
      shift === "morning" &&
      (hour < 6 || hour >= 18)
    ) {
      return true;
    }

    // ✅ NIGHT
    if (
      shift === "night" &&
      hour >= 6 &&
      hour < 18
    ) {
      return true;
    }

    return false;
  };

  // ============================
  // 📊 STATS
  // ============================
  const totalEmployees =
    new Set(records.map((r) => r.user))
      .size;

  const activeNow = records.filter(
    (r) => !r.logout_time
  ).length;

  const totalRecords = records.length;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* SIDEBAR */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleLogout={handleLogout}
        tlData={tlData}
      />

      {/* MAIN */}
      <div
        className={`transition-all duration-300 ${sidebarOpen ? "md:ml-64" : "ml-0"
          }`}
      >

        {/* HEADER */}
        <div className="bg-white shadow p-4 flex justify-between items-center">

          <div className="flex items-center gap-3">

            {/* BURGER */}
            <button
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
              className="text-2xl"
            >
              ☰
            </button>

            <h1 className="text-2xl font-bold">
              TL Dashboard
            </h1>

          </div>

          <div className="flex items-center gap-3">

            {/* TL PROFILE */}
            {tlData?.profile_image ? (
              <img
                src={tlData.profile_image}
                alt="profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                {tlData?.first_name
                  ?.charAt(0)
                  ?.toUpperCase() || "T"}
              </div>
            )}

            <div>
              <p className="font-semibold text-sm">
                {tlData?.first_name}{" "}
                {tlData?.last_name}
              </p>

              <p className="text-xs text-gray-500">
                Team Leader
              </p>
            </div>

          </div>

        </div>

        <div className="p-6 max-w-7xl mx-auto">

          {/* EMPLOYEE MANAGEMENT TAB */}
          {activeTab === "employees" && (
            <EmployeeManagement />
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <>
              {/* STATS */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">

                <div className="bg-white p-4 rounded shadow">
                  <p>Total Employees</p>

                  <h2 className="text-xl font-bold">
                    {totalEmployees}
                  </h2>
                </div>

                <div className="bg-white p-4 rounded shadow">
                  <p>Active Now</p>

                  <h2 className="text-xl font-bold">
                    {activeNow}
                  </h2>
                </div>

                <div className="bg-white p-4 rounded shadow">
                  <p>Total Records</p>

                  <h2 className="text-xl font-bold">
                    {totalRecords}
                  </h2>
                </div>

              </div>

              {/* FILTER */}
              <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3 items-center">

                <input
                  type="text"
                  placeholder="Staff ID"
                  value={staffId}
                  onChange={(e) =>
                    setStaffId(e.target.value)
                  }
                  className="border p-2 rounded w-40"
                />

                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) =>
                    setFromDate(e.target.value)
                  }
                  className="border p-2 rounded"
                />

                <input
                  type="date"
                  value={toDate}
                  onChange={(e) =>
                    setToDate(e.target.value)
                  }
                  className="border p-2 rounded"
                />

                <select
                  value={shift}
                  onChange={(e) =>
                    setShift(e.target.value)
                  }
                  className="border p-2 rounded"
                >
                  <option value="">
                    All Shift
                  </option>

                  <option value="Morning">
                    Morning
                  </option>

                  <option value="Night">
                    Night
                  </option>

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
                      <th className="p-3">
                        Staff ID
                      </th>

                      <th className="p-3 text-left">
                        Employee
                      </th>

                      <th className="p-3">
                        Date
                      </th>

                      <th className="p-3">
                        Shift
                      </th>

                      <th className="p-3">
                        Login
                      </th>

                      <th className="p-3">
                        Logout
                      </th>

                      <th className="p-3">
                        Hours
                      </th>

                      <th className="p-3">
                        Status
                      </th>
                    </tr>

                  </thead>

                  <tbody>

                    {Array.isArray(records) &&
                      records.map((rec, i) => {

                        const hours =
                          parseFloat(
                            rec.total_hours || 0
                          );

                        const isWorking =
                          !rec.logout_time;

                        return (
                          <tr
                            key={i}
                            className="border-b"
                          >

                            <td className="p-3 text-center">
                              {rec.staff_id || "-"}
                            </td>

                            <td className="p-3 flex items-center gap-2">

                              {rec.user}

                              {isWorking && (
                                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                  ● Working
                                </span>
                              )}

                            </td>

                            <td className="p-3 text-center">
                              {new Date(
                                rec.login_time
                              ).toLocaleDateString()}
                            </td>

                            <td className="p-3 text-center">
                              {rec.shift}
                            </td>

                            <td className="p-3 text-green-600 text-center">
                              {new Date(
                                rec.login_time
                              ).toLocaleTimeString()}
                            </td>

                            <td className="p-3 text-red-500 text-center">
                              {rec.logout_time
                                ? new Date(
                                  rec.logout_time
                                ).toLocaleTimeString()
                                : "—"}
                            </td>

                            <td
                              className={`p-3 text-center ${getHoursColor(
                                hours
                              )}`}
                            >
                              {getLiveHours(rec)}
                            </td>

                            <td className="p-3 text-center">

                              {rec.logout_status === "Auto Closed" ? (

                                <span className="text-blue-600 font-semibold">
                                  Auto Closed
                                </span>

                              ) : rec.logout_status === "Emergency Logout" ? (

                                <span className="text-red-500 font-semibold">
                                  Emergency Logout
                                </span>

                              ) : checkShiftViolation(rec) ? (

                                <span className="text-red-600 font-bold">
                                  Invalid
                                </span>

                              ) : checkLate(rec) ? (

                                <span className="text-yellow-600 font-semibold">
                                  Late
                                </span>

                              ) : !rec.logout_time ? (

                                <span className="text-green-600 font-semibold">
                                  Working
                                </span>

                              ) : (

                                <span className="text-green-600">
                                  Normal
                                </span>

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
                  onClick={() =>
                    setPage((p) =>
                      Math.max(p - 1, 1)
                    )
                  }
                  disabled={page === 1}
                  className={`px-4 py-2 rounded ${page === 1
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
                  onClick={() =>
                    setPage((p) =>
                      Math.min(
                        p + 1,
                        totalPages
                      )
                    )
                  }
                  disabled={
                    page >= totalPages
                  }
                  className={`px-4 py-2 rounded ${page >= totalPages
                    ? "bg-gray-200 cursor-not-allowed"
                    : "bg-gray-300 hover:bg-gray-400"
                    }`}
                >
                  Next
                </button>

              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default TLDashboard;