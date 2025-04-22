import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export const RegisterForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);
    setSuccess(false);

    try {
      console.log("RegisterForm: Attempting registration for:", email, displayName);
      await register(email, password, displayName);
      console.log("RegisterForm: Registration successful for:", email);
      setSuccess(true);
      // Optionally redirect after a delay or let the user click a link
      setTimeout(() => {
        navigate("/login");
      }, 2000); // Redirect to login after 2 seconds
    } catch (err: any) {
      console.error("RegisterForm: Registration error:", err);
      setError(`${err.message || "Registration failed. Please try again."}`);
      setLoading(false);
    } 
    // Keep loading true on success until redirect
  };

  return (
    <div className="register-form auth-form"> {/* Added auth-form class for potential shared styles */}
      <h2>Daily Task Tracker</h2>
      <h3>Register New Employee</h3>

      {loading && !success && (
        <div className="loading-message">
          <div className="loading-spinner"></div>
          <p>Creating account...</p>
        </div>
      )}

      {success && (
        <div className="success-message">
           <p>Account created successfully! Redirecting to login...</p>
        </div>
      )}
      
      {error && <div className="error-alert">{error}</div>}
      
      {!success && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="displayName">Full Name</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
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
              minLength={6} // Enforce minimum password length
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="submit-button">
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      )}

      <div className="auth-switch-link">
        <p>Already have an account? <Link to="/login">Login here</Link></p>
      </div>

      {/* Basic inline styles, consider moving to a CSS file */}
      <style>{`
        .auth-form { /* Shared styles with LoginForm potentially */
          max-width: 400px;
          margin: 40px auto;
          padding: 30px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          background-color: var(--bg-accent);
          text-align: center;
        }
        .auth-form h2 {
          margin-bottom: 10px;
          color: var(--text-primary);
          font-weight: 700;
        }
        .auth-form h3 {
          margin-bottom: 25px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .form-group input {
          width: 100%;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          box-sizing: border-box; /* Needed to prevent padding from increasing size */
        }
        .submit-button {
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
        .submit-button:hover:not(:disabled) {
          background-color: var(--primary-color-dark);
        }
        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-alert {
          background-color: rgba(245, 78, 0, 0.1);
          color: var(--primary-color);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          text-align: center;
        }
         .success-message {
          background-color: rgba(40, 167, 69, 0.1);
          color: var(--success-color);
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          text-align: center;
        }
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
          border-radius: 5px;
        }
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