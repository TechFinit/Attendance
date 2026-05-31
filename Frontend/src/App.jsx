import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EmployeePage from "./pages/EmployeePage";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import TLDashboard from "./pages/TLDashboard";
import AdminDashboard from "./pages/AdminDashboard"; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EmployeePage />} />
        <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
        <Route path="/tl-dashboard" element={<TLDashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />}/>
      </Routes>
    </Router>
  );
}

export default App;