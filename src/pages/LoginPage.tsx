import { LoginForm } from "../components/auth/LoginForm";
import { Logo } from "../components/layout/Logo";

export const LoginPage = () => {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo-container">
          <div className="auth-logo">
            <Logo width="300px" variant="light" isLoginLogo={true} />
          </div>
        </div>

        <div className="auth-form-container">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}; 