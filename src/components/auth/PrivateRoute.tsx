import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { UserRole } from "../../types";

interface PrivateRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export const PrivateRoute = ({ children, requiredRole }: PrivateRouteProps) => {
  const { currentUser, loading } = useAuth();

  // Check if still loading auth state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user is logged in
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If a specific role is required, check if the user has that role
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(currentUser.role)) {
      // Redirect to the appropriate page based on the user's role
      if (currentUser.role === "manager") {
        return <Navigate to="/manager" />;
      } else {
        return <Navigate to="/employee" />;
      }
    }
  }

  return <>{children}</>;
}; 