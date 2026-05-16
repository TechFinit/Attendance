import { useEffect, useState } from "react";
import axios from "axios";

function AdminDashboard() {
  const [shiftSettings, setShiftSettings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ============================
  // ✅ FETCH SHIFT SETTINGS
  // ============================
  const fetchShiftSettings = async () => {
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/shift-settings",
      );

      setShiftSettings(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchShiftSettings();
  }, []);

  // ============================
  // ✅ ACTIVATE MODE
  // ============================
  const activateMode = async (id) => {
    try {
      setLoading(true);

      const res = await axios.put(
        `http://127.0.0.1:8000/api/shift-settings/${id}`,
      );

      setMessage(res.data.message);

      fetchShiftSettings();

      setLoading(false);
    } catch (err) {
      console.log(err);

      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* ============================
          HEADER
      ============================ */}
      <div className="bg-white shadow rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Admin Dashboard
        </h1>

        <p className="text-gray-500 mt-2">
          Manage Shift Engine Configuration
        </p>
      </div>

      {/* ============================
          MESSAGE
      ============================ */}
      {message && (
        <div className="bg-green-100 text-green-700 px-4 py-3 rounded-lg mb-4">
          {message}
        </div>
      )}

      {/* ============================
          SHIFT SETTINGS
      ============================ */}
      <div className="bg-white shadow rounded-xl p-6 overflow-x-auto">
        <h2 className="text-2xl font-semibold mb-4">
          Shift Settings
        </h2>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-600 text-white">
              <th className="p-3 border">
                Mode
              </th>

              <th className="p-3 border">
                Morning Login
              </th>

              <th className="p-3 border">
                Morning Logout
              </th>

              <th className="p-3 border">
                Night Login
              </th>

              <th className="p-3 border">
                Night Logout
              </th>

              <th className="p-3 border">
                Status
              </th>

              <th className="p-3 border">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {shiftSettings.map((shift) => (
              <tr
                key={shift.id}
                className="text-center hover:bg-gray-50"
              >
                <td className="p-3 border font-semibold">
                  {shift.mode_name}
                </td>

                <td className="p-3 border">
                  {shift.day_login}
                </td>

                <td className="p-3 border">
                  {shift.day_logout}
                </td>

                <td className="p-3 border">
                  {shift.night_login}
                </td>

                <td className="p-3 border">
                  {shift.night_logout}
                </td>

                <td className="p-3 border">
                  {shift.is_active ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Active
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                      Inactive
                    </span>
                  )}
                </td>

                <td className="p-3 border">
                  {!shift.is_active && (
                    <button
                      onClick={() =>
                        activateMode(shift.id)
                      }
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                    >
                      Activate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;