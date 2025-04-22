import { RegisterForm } from "../components/auth/RegisterForm";

export const RegisterPage = () => {
  return (
    <div className="auth-page"> {/* Using the same class as LoginPage for consistency */}
      <RegisterForm />
    </div>
  );
}; 