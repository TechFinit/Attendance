import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../config/api";

function EmployeeDashboard() {
    const navigate = useNavigate();

    const [status, setStatus] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    const firstName =
        sessionStorage.getItem("employee_first_name") || "";

    const lastName =
        sessionStorage.getItem("employee_last_name") || "";

    const staffId =
        sessionStorage.getItem("employee_staff_id") || "";

    const username =
        sessionStorage.getItem("sessionUser") || "Employee";

    // Clock
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Load attendance
    useEffect(() => {
        fetchTodayStatus(username);
    }, []);

    const fetchTodayStatus = async (user) => {
        try {
            const res = await fetch(`${API_URL}/api/today`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: user,
                }),
            });

            const data = await res.json();

            if (!data.message) {
                setStatus(data);
            } else {
                setStatus(null);
            }
        } catch (err) {
            console.log(err);
        }
    };

    const handleLogoutClick = () => {
        if (!status) {
            return;
        }

        const loginTime = new Date(status.login_time);
        const now = new Date();

        const hoursWorked =
            (now - loginTime) / (1000 * 60 * 60);

        if (hoursWorked < 9) {
            setShowModal(true);
        } else {
            handleLogout();
        }
    };

    const handleLogout = async () => {
        try {
            const user =
                sessionStorage.getItem("sessionUser");

            const res = await fetch(
                `${API_URL}/api/logout`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: user,
                    }),
                }
            );

            const data = await res.json();

            if (data.error) {
                alert(data.error);
                return;
            }

            sessionStorage.removeItem("sessionUser");
            sessionStorage.removeItem("username");

            navigate("/");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">

            {/* HEADER */}
            <div className="bg-white shadow p-4 flex justify-between items-center">

                <h1 className="text-2xl font-bold">
                    Employee Dashboard
                </h1>

                <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                        {username.charAt(0).toUpperCase()}
                    </div>

                    <div>
                        <p className="font-semibold text-gray-800">
                            {firstName} {lastName}
                        </p>

                        <p className="text-sm text-gray-500">
                            {staffId}
                        </p>

                        <button
                            onClick={handleLogoutClick}
                            className="text-red-500 text-sm"
                        >
                            Logout
                        </button>
                    </div>

                </div>

            </div>

            {/* EARLY LOGOUT MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">

                    <div className="bg-white p-6 rounded-xl w-80">

                        <h2 className="text-lg font-bold mb-3">
                            Early Logout
                        </h2>

                        <p className="mb-4">
                            You haven't completed 9 hours.
                        </p>

                        <div className="flex justify-end gap-3">

                            <button
                                onClick={() =>
                                    setShowModal(false)
                                }
                                className="px-4 py-2 bg-gray-300 rounded"
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
    );
}

export default EmployeeDashboard;