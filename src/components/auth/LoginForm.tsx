import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>("");
  const navigate = useNavigate();
  const { login, currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    console.log("Auth state in LoginForm:", { currentUser, authLoading });
    
    // If we have a current user, redirect them
    if (currentUser) {
      console.log("LoginForm: User detected, redirecting based on role:", currentUser.role);
      setLoginSuccess(true);
      setLoadingPhase("Redirecting to dashboard...");
      
      // Short timeout to ensure state updates have propagated
      setTimeout(() => {
        redirectBasedOnRole(currentUser.role);
      }, 100);
    } else if (!authLoading && loading && !loginSuccess) {
      // If auth is not loading, our form is in loading state, but we don't have a user
      // and we haven't already succeeded, then reset the loading state
      console.log("LoginForm: No user after auth completed, resetting loading state");
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  const redirectBasedOnRole = (role: string) => {
    console.log(`LoginForm: Redirecting to ${role === "manager" ? "/manager" : "/employee"}`);
    
    // Force navigation even if there's a problem with React Router
    try {
      if (role === "manager") {
        navigate("/manager");
        // Fallback direct navigation in case React Router fails
        setTimeout(() => {
          if (window.location.pathname !== "/manager") {
            window.location.href = "/manager";
          }
        }, 500);
      } else {
        navigate("/employee");
        // Fallback direct navigation in case React Router fails
        setTimeout(() => {
          if (window.location.pathname !== "/employee") {
            window.location.href = "/employee";
          }
        }, 500);
      }
    } catch (err) {
      console.error("Navigation error, falling back to direct URL change:", err);
      window.location.href = role === "manager" ? "/manager" : "/employee";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow multiple simultaneous login attempts
    if (loading) return;
    
    // Clear any previous errors
    setError("");
    setLoading(true);
    setLoginSuccess(false);
    setLoadingPhase("Authenticating...");
    
    try {
      console.log("LoginForm: Attempting login with:", email);
      await login(email, password);
      setLoadingPhase("Loading user data...");
      console.log("LoginForm: Login function completed");
      
      // We'll add a manual redirect if the useEffect doesn't trigger
      setTimeout(() => {
        if (loading && !loginSuccess && currentUser) {
          console.log("LoginForm: Manual redirect triggered");
          redirectBasedOnRole(currentUser.role);
        } else if (loading && !loginSuccess) {
          // If still loading but no success, show error
          setLoading(false);
          setError("Login timed out. Please try again.");
        }
      }, 2000);
    } catch (err: any) {
      console.error("LoginForm: Login error:", err);
      setError(`${err.message || "Login failed. Please check your credentials."}`);
      setLoading(false);
      setLoginSuccess(false);
      setLoadingPhase("");
    }
  };

  // Render a simple message if login was successful but we're waiting for redirect
  if (loginSuccess) {
    return (
      <div className="login-form">
        <h2>Login Successful</h2>
        <p>Redirecting to your dashboard...</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="login-form">
      <h2>Daily Task Tracker</h2>
      <h3>Login</h3>
      
      {loading && (
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>{loadingPhase || "Processing..."}</p>
        </div>
      )}
      
      {error && <div className="error-alert">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <button type="submit" disabled={loading} className="login-button">
          {loading ? loadingPhase || "Logging in..." : "Login"}
        </button>
      </form>
      
      {/* Add link to Register page */}
      <div className="auth-switch-link">
        <p>Need an account? <Link to="/register">Register here</Link></p>
      </div>
      
      <style>{`
        .loading-spinner {
          border: 4px solid var(--border-color);
          border-top: 4px solid var(--primary-color);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .loading-message {
          text-align: center;
          margin-bottom: 20px;
          padding: 10px;
          background-color: var(--bg-secondary);
          border-radius: 5px;
        }
        
        .login-button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 10px 15px;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: background-color 0.3s;
          font-weight: 600;
        }
        
        .login-button:hover:not(:disabled) {
          background-color: var(--primary-color-dark);
        }
        
        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .error-alert {
          background-color: rgba(245, 78, 0, 0.1);
          color: var(--primary-color);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        
        /* Add styles for the switch link container */
        .auth-switch-link {
            margin-top: 20px;
            font-size: 0.9em;
        }
        .auth-switch-link a {
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 600;
        }
         .auth-switch-link a:hover {
            opacity: 0.9;
        }
      `}</style>
    </div>
  );
}; 