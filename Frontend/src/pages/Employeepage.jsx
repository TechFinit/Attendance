import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function EmployeePage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const navigate = useNavigate();

  // ⏰ Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ LOAD SESSION USER
  useEffect(() => {
    const storedUser = sessionStorage.getItem("sessionUser");
    if (storedUser) {
      setUsername(storedUser);
      fetchTodayStatus(storedUser);
    }
  }, []);

  // ============================
  // 🔐 LOGIN
  // ============================
  const handleLogin = async () => {
    if (!username || !password) {
      setMsg("Enter username & password");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const cleanUsername = username.toLowerCase().trim();

      const res = await fetch("http://127.0.0.1:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
          timezone,
        }),
      });

      const data = await res.json();
      console.log("LOGIN RESPONSE:", data);

      if (data.error && !data.alreadyLoggedIn) {
        setMsg(data.error);
        setLoading(false);
        return;
      }

      // ✅ TL LOGIN
      if (data.role === "tl") {
        sessionStorage.clear();

        sessionStorage.setItem("role", "tl");

        sessionStorage.setItem(
          "tl_first_name",
          data.first_name || ""
        );

        sessionStorage.setItem(
          "tl_last_name",
          data.last_name || ""
        );

        sessionStorage.setItem(
          "tl_profile_image",
          data.profile_image || ""
        );

        navigate("/tl-dashboard");

        return;
      }

      // ✅ ADMIN
      if (data.role === "admin") {

        sessionStorage.setItem("role", "admin");

        sessionStorage.setItem(
          "admin_first_name",
          data.first_name
        );

        sessionStorage.setItem(
          "admin_last_name",
          data.last_name
        );

        sessionStorage.setItem(
          "admin_profile_image",
          data.profile_image
        );

        navigate("/admin-dashboard");

        return;
      }


      // ============================
      // ✅ EMPLOYEE LOGIN + REDIRECT
      // ============================
      sessionStorage.setItem("sessionUser", cleanUsername);
      sessionStorage.setItem("username", cleanUsername); // ✅ FIX ADDED
      setUsername(cleanUsername);

      await fetchTodayStatus(cleanUsername);

      setMsg(
        data.alreadyLoggedIn
          ? "Already Logged In"
          : "Login Successful"
      );

      setTimeout(() => {
        navigate("/employee-dashboard");
      }, 400);

    } catch (err) {
      console.log(err);
      setMsg("Server error");
    }

    setLoading(false);
  };

  // ============================
  // 🔥 LOGOUT CLICK
  // ============================
  const handleLogoutClick = () => {
    if (!status) {
      setMsg("No active session");
      return;
    }

    const loginTime = new Date(status.login_time);
    const now = new Date();
    const hoursWorked = (now - loginTime) / (1000 * 60 * 60);

    if (hoursWorked < 9) {
      setShowModal(true);
    } else {
      handleLogout();
    }
  };

  // ============================
  // 🔐 LOGOUT (FIXED)
  // ============================
  const handleLogout = async () => {
    try {
      const user = sessionStorage.getItem("sessionUser");

      if (!user) {
        setMsg("No active session found");
        return;
      }

      const res = await fetch("http://127.0.0.1:8000/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: user,
        }),
      });

      const data = await res.json();
      console.log("LOGOUT RESPONSE:", data);

      if (data.error) {
        setMsg(data.error);
        return;
      }

      setMsg("Logout Successful ✅");

      // ✅ CLEAR SESSION
      sessionStorage.removeItem("sessionUser");
      sessionStorage.removeItem("username");

      // ✅ RESET STATE
      setStatus(null);
      setUsername("");
      setPassword("");
      setShowModal(false);

      // ✅ REFRESH STATUS (IMPORTANT FIX)
      await fetchTodayStatus(user);

      setTimeout(() => {
        navigate("/");
      }, 500);

    } catch (err) {
      console.log(err);
      setMsg("Logout failed");
    }
  };

  // ============================
  // 📊 FETCH STATUS
  // ============================
  const fetchTodayStatus = async (user) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/today", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: user }),
      });

      const data = await res.json();

      if (!data.message) {
        setStatus(data);
      } else {
        setStatus(null);
      }
    } catch (err) {
      console.log("Error fetching status", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-4xl mx-auto px-4">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
              {username ? username.charAt(0).toUpperCase() : "E"}
            </div>

            <div>
              <p className="text-sm text-gray-500">Welcome back</p>
              <h2 className="text-lg font-semibold text-gray-800">
                {username || "Employee"} 👋
              </h2>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">
              {currentTime.toLocaleDateString()}
            </p>
            <h2 className="text-lg font-bold text-indigo-600">
              {currentTime.toLocaleTimeString()}
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          {/* LOGIN */}
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Employee Login</h2>

            <input
              type="text"
              placeholder="Username"
              value={username}
              className="w-full p-3 border rounded-lg mb-4"
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border rounded-lg mb-6"
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg mb-3"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <button
              onClick={handleLogoutClick}
              className="w-full bg-red-500 text-white py-2 rounded-lg"
            >
              Logout
            </button>
          </div>

          {/* STATUS */}
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-xl font-bold mb-4">Today’s Status</h2>

            {msg && (
              <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-600">
                {msg}
              </div>
            )}

            {!status ? (
              <p className="text-gray-500 text-center">
                No attendance recorded today
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>User</span>
                  <span>{status.user}</span>
                </div>

                <div className="flex justify-between">
                  <span>Login</span>
                  <span className="text-green-600">
                    {new Date(status.login_time).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Logout</span>
                  <span className="text-red-500">
                    {status.logout_time
                      ? new Date(status.logout_time).toLocaleString()
                      : "Still Working"}
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-80">
              <h2 className="text-lg font-bold mb-2">Early Logout</h2>
              <p className="text-sm mb-4">
                You haven’t completed 9 hours. Are you sure?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>

                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded"
                >
                  Logout Anyway
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EmployeePage;