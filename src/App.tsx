import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { PrivateRoute } from "./components/auth/PrivateRoute";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ManagerDashboardPage } from "./pages/ManagerDashboardPage";
import { ManagerTasksPage } from "./pages/ManagerTasksPage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import "./styles/main.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Manager Routes */}
          <Route 
            path="/manager" 
            element={
              <PrivateRoute requiredRole="manager">
                <ManagerDashboardPage />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/tasks" 
            element={
              <PrivateRoute requiredRole="manager">
                <ManagerTasksPage />
              </PrivateRoute>
            } 
          />
          
          {/* Employee Routes */}
          <Route 
            path="/employee" 
            element={
              <PrivateRoute requiredRole="employee">
                <EmployeeDashboardPage />
              </PrivateRoute>
            } 
          />
          
          {/* Default redirect based on role */}
          <Route 
            path="/" 
            element={<RoleBasedRedirect />} 
          />
          
          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Component to redirect users based on their role
const RoleBasedRedirect = () => {
  const { currentUser, loading } = useAuth();
  const [localLoading, setLocalLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    console.log("RoleBasedRedirect - Auth state:", { currentUser, loading });
    
    // Add a timeout to avoid infinite loading
    const timer = setTimeout(() => {
      setLocalLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentUser, loading]);
  
  // Show loading only for a reasonable time
  if (loading && localLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading your account...</p>
      </div>
    );
  }
  
  // If no current user from auth context, check localStorage as backup
  if (!currentUser) {
    try {
      // Try to get auth data from localStorage as fallback
      const localAuth = JSON.parse(localStorage.getItem("auth") || "null");
      
      if (localAuth && localAuth.role) {
        console.log("Using localStorage auth data for redirect:", localAuth.role);
        
        // Force navigation with a fallback
        try {
          if (localAuth.role === "manager") {
            navigate("/manager");
            // Fallback direct navigation
            setTimeout(() => {
              if (window.location.pathname !== "/manager") {
                window.location.href = "/manager";
              }
            }, 300);
          } else {
            navigate("/employee");
            // Fallback direct navigation
            setTimeout(() => {
              if (window.location.pathname !== "/employee") {
                window.location.href = "/employee";
              }
            }, 300);
          }
          return null;
        } catch (err) {
          console.error("Navigation error:", err);
          window.location.href = localAuth.role === "manager" ? "/manager" : "/employee";
          return null;
        }
      }
    } catch (err) {
      console.error("Error reading from localStorage:", err);
    }
    
    console.log("No authenticated user, redirecting to login");
    return <Navigate to="/login" />;
  }
  
  console.log("User authenticated, redirecting based on role:", currentUser.role);
  if (currentUser.role === "manager") {
    return <Navigate to="/manager" />;
  }
  
  return <Navigate to="/employee" />;
};

export default App;
