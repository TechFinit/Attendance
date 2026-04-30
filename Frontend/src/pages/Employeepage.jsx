import { useState, useEffect } from "react";

function EmployeePage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔥 Custom Logout Modal
  const [showModal, setShowModal] = useState(false);

  // ⏰ Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 AUTO LOAD USER AFTER REFRESH
  useEffect(() => {
    const savedUser = localStorage.getItem("username");
    if (savedUser) {
      setUsername(savedUser);
      fetchTodayStatus(savedUser);
    }
  }, []);

  // 🔥 LOGIN
  const handleLogin = async () => {
    if (!username || !password) {
      setMsg("Enter username & password");
      setIsError(true);
      return;
    }

    setLoading(true);
    setStatus(null);
    setMsg("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.error) {
        setMsg(data.error);
        setIsError(true);
      } else {
        setIsError(false);

        const role = data.role?.toLowerCase();

        if (role === "tl") {
          localStorage.setItem("role", "tl");
          window.location.href = "/tl-dashboard";
        } else {
          localStorage.setItem("role", "employee");
          localStorage.setItem("username", username);

          setMsg("Login successful");

          setStatus({
            user: data.user,
            login_time: data.login_time,
            logout_time: null,
          });
        }
      }
    } catch {
      setMsg("Server error");
      setIsError(true);
    }

    setLoading(false);
  };

  // 🔥 LOGOUT CLICK
  const handleLogoutClick = () => {
    if (!status || !status.login_time) return;

    const loginTime = new Date(status.login_time);
    const now = new Date();

    const hoursWorked = (now - loginTime) / (1000 * 60 * 60);

    if (hoursWorked < 9) {
      setShowModal(true); // show custom modal
    } else {
      handleLogout();
    }
  };

  // 🔥 CONFIRM LOGOUT
  const handleLogout = async () => {
    const res = await fetch("http://127.0.0.1:8000/api/logout/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();

    setMsg(data.message || "Logout successful");
    setIsError(false);

    localStorage.removeItem("username");
    localStorage.removeItem("role");

    setStatus({
      ...status,
      logout_time: new Date().toISOString(),
    });

    setShowModal(false);
  };

  const fetchTodayStatus = async (user) => {
    const res = await fetch("http://127.0.0.1:8000/api/today/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: user }),
    });

    const data = await res.json();
    if (!data.message) setStatus(data);
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

          {/* CLOCK */}
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {currentTime.toLocaleDateString()}
            </p>
            <h2 className="text-lg font-bold text-indigo-600">
              {currentTime.toLocaleTimeString()}
            </h2>
          </div>
        </div>

        {/* GRID */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* LOGIN CARD */}
          <div className="bg-white p-8 rounded-2xl shadow-lg">

            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Employee Login
            </h2>

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
              disabled={loading}
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

          {/* STATUS CARD */}
          <div className="bg-white p-8 rounded-2xl shadow-lg">

            <h2 className="text-xl font-bold mb-4">
              Today’s Status
            </h2>

            {/* 🔥 MESSAGE ON TOP */}
            {msg && (
              <div className="mb-4 text-sm font-medium p-3 rounded-lg bg-green-100 text-green-600">
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

        {/* 🔥 CUSTOM MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl shadow-lg w-80">

              <h2 className="text-lg font-bold mb-2">
                Early Logout
              </h2>

              <p className="text-sm text-gray-600 mb-4">
                You haven’t completed 9 hours. Are you sure you want to logout?
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