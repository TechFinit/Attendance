import { useEffect, useState } from "react";
import API_URL from "../config/api";

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

  // PROFILE IMAGE
  const [profileImage, setProfileImage] =
    useState(null);

  // EDIT STATES
  const [editingEmployee, setEditingEmployee] =
    useState(null);

  const [editFirstName, setEditFirstName] =
    useState("");

  const [editLastName, setEditLastName] =
    useState("");

  const [editDepartment, setEditDepartment] =
    useState("");

  const [editPhone, setEditPhone] =
    useState("");

  const [editProfileImage, setEditProfileImage] =
    useState(null);

  // ============================
  // FETCH EMPLOYEES
  // ============================
  const fetchEmployees = async () => {
    setLoading(true);

    try {

      const role = sessionStorage.getItem("role");

      const res = await fetch(
        `${API_URL}/api/employees`,
        {
          headers: {
            authorization: role,
          },
        }
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
  // ADD EMPLOYEE
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
      const formData = new FormData();

      formData.append(
        "first_name",
        firstName
      );

      formData.append(
        "last_name",
        lastName
      );

      formData.append("email", email);

      formData.append(
        "password",
        password
      );

      formData.append(
        "department",
        department
      );

      formData.append("phone", phone);

      formData.append(
        "role",
        "employee"
      );

      // IMAGE
      if (profileImage) {
        formData.append(
          "profile_image",
          profileImage
        );
      }

      const role = sessionStorage.getItem("role");

      const res = await fetch(
        `${API_URL}/api/employees`,
        {
          method: "POST",
          headers: {
            authorization: role,
          },
          body: formData,
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
      setProfileImage(null);

      fetchEmployees();

    } catch (err) {
      console.log(err);
      alert("Server error");
    }
  };

  // ============================
  // START EDIT
  // ============================
  const handleEditClick = (emp) => {
    setEditingEmployee(emp.id);

    setEditFirstName(emp.first_name || "");
    setEditLastName(emp.last_name || "");
    setEditDepartment(emp.department || "");
    setEditPhone(emp.phone || "");

    setEditProfileImage(null);
  };

  // ============================
  // SAVE EDIT
  // ============================
  const handleSaveEdit = async (id) => {
    try {
      const formData = new FormData();

      formData.append(
        "first_name",
        editFirstName
      );

      formData.append(
        "last_name",
        editLastName
      );

      formData.append(
        "department",
        editDepartment
      );

      formData.append(
        "phone",
        editPhone
      );

      if (editProfileImage) {
        formData.append(
          "profile_image",
          editProfileImage
        );
      }

      const res = await fetch(
        `${API_URL}/api/employees/${id}`,
        {
          method: "PUT",
          headers: {
            authorization: role,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      alert("Employee Updated Successfully");

      setEditingEmployee(null);

      fetchEmployees();

    } catch (err) {
      console.log(err);
      alert("Update failed");
    }
  };

  // ============================
  // DELETE EMPLOYEE
  // ============================
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Remove employee?"
    );

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${API_URL}/api/employees/delete/${id}`,
        {
          method: "PUT",
          headers: {
            authorization: role,
          },
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
            autoComplete="off"
            onChange={(e) =>
              setFirstName(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Last Name"
            value={lastName}
            autoComplete="off"
            onChange={(e) =>
              setLastName(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="email"
            placeholder="Work Email"
            value={email}
            autoComplete="off"
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="password"
            placeholder="Temporary Password"
            value={password}
            autoComplete="new-password"
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Department"
            value={department}
            autoComplete="off"
            onChange={(e) =>
              setDepartment(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          <input
            type="text"
            placeholder="Phone"
            value={phone}
            autoComplete="off"
            onChange={(e) =>
              setPhone(e.target.value)
            }
            className="border p-3 rounded-lg"
          />

          {/* PROFILE IMAGE */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setProfileImage(
                e.target.files[0]
              )
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

                      {/* PROFILE IMAGE */}
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

                        {editingEmployee === emp.id ? (
                          <div className="space-y-2">

                            <input
                              type="text"
                              value={editFirstName}
                              autoComplete="off"
                              onChange={(e) =>
                                setEditFirstName(
                                  e.target.value
                                )
                              }
                              className="border p-1 rounded w-full"
                            />

                            <input
                              type="text"
                              value={editLastName}
                              autoComplete="off"
                              onChange={(e) =>
                                setEditLastName(
                                  e.target.value
                                )
                              }
                              className="border p-1 rounded w-full"
                            />

                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                setEditProfileImage(
                                  e.target.files[0]
                                )
                              }
                              className="border p-1 rounded w-full"
                            />

                          </div>
                        ) : (
                          <>
                            <p className="font-semibold">
                              {emp.first_name}{" "}
                              {emp.last_name}
                            </p>

                            <p className="text-xs text-gray-500">
                              {emp.role}
                            </p>
                          </>
                        )}

                      </div>

                    </div>

                  </td>

                  <td className="p-3 text-center">
                    {emp.staff_id}
                  </td>

                  <td className="p-3 text-center">

                    {editingEmployee === emp.id ? (
                      <input
                        type="text"
                        value={editDepartment}
                        autoComplete="off"
                        onChange={(e) =>
                          setEditDepartment(
                            e.target.value
                          )
                        }
                        className="border p-1 rounded w-full"
                      />
                    ) : (
                      emp.department || "-"
                    )}

                  </td>

                  <td className="p-3 text-center">
                    {emp.email}
                  </td>

                  <td className="p-3 text-center">

                    {editingEmployee === emp.id ? (
                      <input
                        type="text"
                        value={editPhone}
                        autoComplete="off"
                        onChange={(e) =>
                          setEditPhone(
                            e.target.value
                          )
                        }
                        className="border p-1 rounded w-full"
                      />
                    ) : (
                      emp.phone || "-"
                    )}

                  </td>

                  <td className="p-3 text-center">

                    {editingEmployee === emp.id ? (
                      <div className="flex gap-2 justify-center">

                        <button
                          onClick={() =>
                            handleSaveEdit(emp.id)
                          }
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Save
                        </button>

                        <button
                          onClick={() =>
                            setEditingEmployee(null)
                          }
                          className="bg-gray-400 text-white px-3 py-1 rounded"
                        >
                          Cancel
                        </button>

                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">

                        <button
                          onClick={() =>
                            handleEditClick(emp)
                          }
                          className="bg-blue-500 text-white px-3 py-1 rounded"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() =>
                            handleDelete(emp.id)
                          }
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Remove
                        </button>

                      </div>
                    )}

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