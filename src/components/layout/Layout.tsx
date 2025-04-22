import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
}; 