import { useEffect, useState } from "react";

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // ADD FORM
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  // ============================
  // 📡 FETCH EMPLOYEES
  // ============================
  const fetchEmployees = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/employees"
      );

      const data = await res.json();

      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      setEmployees([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ============================
  // ➕ ADD EMPLOYEE
  // ============================
  const handleAddEmployee = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      alert("Please fill required fields");
      return;
    }

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/employees",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            department,
            phone,
            role: "employee",
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      alert("Employee Added Successfully");

      // RESET
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setDepartment("");
      setPhone("");

      fetchEmployees();

    } catch (err) {
      console.log(err);
      alert("Server error");
    }
  };

  // ============================
  // ❌ DELETE EMPLOYEE
  // ============================
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Remove employee?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/employees/delete/${id}`,
        {
          method: "PUT",
        }
      );

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      fetchEmployees();

    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Employee Profile Management
        </h1>

        <p className="text-gray-500">
          Manage employee profiles and access
        </p>
      </div>

      {/* ADD EMPLOYEE */}
      <div className="bg-white p-6 rounded-2xl shadow mb-6">

        <h2 className="text-lg font-bold mb-4">
          Add Employee
        </h2>

        <div className="grid md:grid-cols-3 gap-4">

          <input
            type="text"
            placeholder="First Name"
            value={firstName}
            onChange={(e) =>
              setFirstName(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            onChange={(e) =>
              setLastName(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="email"
            placeholder="Work Email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="password"
            placeholder="Temporary Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Department"
            value={department}
            onChange={(e) =>
              setDepartment(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Phone"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

        </div>

        <button
          onClick={handleAddEmployee}
          className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg"
        >
          Add Employee
        </button>

      </div>

      {/* EMPLOYEE TABLE */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">

        <div className="p-4 border-b">
          <h2 className="font-bold">
            Employee List
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            Loading...
          </div>
        ) : (
          <table className="w-full text-sm">

            <thead className="bg-indigo-600 text-white">
              <tr>
                <th className="p-3 text-left">
                  Employee
                </th>

                <th className="p-3">
                  Staff ID
                </th>

                <th className="p-3">
                  Department
                </th>

                <th className="p-3">
                  Email
                </th>

                <th className="p-3">
                  Phone
                </th>

                <th className="p-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>

              {employees.map((emp) => (
                <tr
                  key={emp.id}
                  className="border-b"
                >

                  {/* PROFILE */}
                  <td className="p-3">

                    <div className="flex items-center gap-3">

                      {/* DEFAULT AVATAR */}
                      {emp.profile_image ? (
                        <img
                          src={emp.profile_image}
                          alt="profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                          {emp.first_name
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold">
                          {emp.first_name}{" "}
                          {emp.last_name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {emp.role}
                        </p>
                      </div>

                    </div>

                  </td>

                  <td className="p-3 text-center">
                    {emp.staff_id}
                  </td>

                  <td className="p-3 text-center">
                    {emp.department || "-"}
                  </td>

                  <td className="p-3 text-center">
                    {emp.email}
                  </td>

                  <td className="p-3 text-center">
                    {emp.phone || "-"}
                  </td>

                  <td className="p-3 text-center">

                    <button
                      onClick={() =>
                        handleDelete(emp.id)
                      }
                      className="bg-red-500 text-white px-3 py-1 rounded"
                    >
                      Remove
                    </button>

                  </td>

                </tr>
              ))}

            </tbody>

          </table>
        )}

      </div>

    </div>
  );
}

export default EmployeeManagement;