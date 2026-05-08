function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  activeTab,
  setActiveTab,
  handleLogout,
  tlData,
}) {
  return (
    <>
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300
        ${
        sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* PROFILE */}
        <div className="p-6 border-b">
          <div className="flex flex-col items-center">

            {/* PROFILE IMAGE */}
            {tlData?.profile_image ? (
              <img
                src={tlData.profile_image}
                alt="profile"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold">
                {tlData?.first_name
                  ? tlData.first_name.charAt(0).toUpperCase()
                  : "T"}
              </div>
            )}

            <h2 className="mt-3 font-bold text-lg">
              {tlData?.first_name}{" "}
              {tlData?.last_name}
            </h2>

            <p className="text-gray-500 text-sm">
              Team Leader
            </p>
          </div>
        </div>

        {/* MENU */}
        <div className="p-4 space-y-3">

          <button
            onClick={() => {
              setActiveTab("dashboard");
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-lg transition
            ${
              activeTab === "dashboard"
                ? "bg-indigo-600 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              setActiveTab("employees");
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-lg transition
            ${
              activeTab === "employees"
                ? "bg-indigo-600 text-white"
                : "hover:bg-gray-100"
            }`}
          >
            Employee Profile Management
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600"
          >
            Logout
          </button>

        </div>
      </div>
    </>
  );
}

export default Sidebar;