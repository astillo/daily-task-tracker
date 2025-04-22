type LogoProps = {
  width?: string;
  height?: string;
  variant?: "light" | "dark"; // light = for dark backgrounds, dark = for light backgrounds
  className?: string;
  isLoginLogo?: boolean;
};

export const Logo = ({ 
  width = "auto", 
  height = "auto", 
  variant = "light", // Default to light (white logo)
  className = "app-logo",
  isLoginLogo = false
}: LogoProps) => {
  return (
    <div style={{ display: 'inline-block' }}>
      <img
        src={isLoginLogo 
          ? "https://c19yks14tt.ufs.sh/f/fzg1aA3TrgMY6RblIbG8JAO0y37Esvqb5k4FhaMrdXwCUImo" 
          : "https://c19yks14tt.ufs.sh/f/fzg1aA3TrgMYu9vwhxrLb7HA0EuZdJeva1osDmtQjqWI6FV4"}
        alt="AMS Manufacturing & Printing"
        width={width}
        height={height}
        className={className}
        style={{ 
          filter: variant === "light" && !isLoginLogo ? "brightness(0) invert(1)" : "none",
          maxWidth: "100%"
        }}
      />
    </div>
  );
}; 