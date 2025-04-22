import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "../../context/AuthContext";

export const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  if (!currentUser) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <Logo width="120px" variant="light" />
        </Link>
        <span className="navbar-title">End of Day Tasks</span>
      </div>

      <div className="navbar-menu">
        {currentUser.role === "manager" && (
          <>
            <Link to="/manager" className="navbar-item">
              Dashboard
            </Link>
            <Link to="/tasks" className="navbar-item">
              Task Templates
            </Link>
            <Link to="/assign" className="navbar-item">
              Assign Tasks
            </Link>
          </>
        )}
        {currentUser.role === "employee" && (
          <Link to="/employee" className="navbar-item">
            Dashboard
          </Link>
        )}
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </div>
    </nav>
  );
}; 