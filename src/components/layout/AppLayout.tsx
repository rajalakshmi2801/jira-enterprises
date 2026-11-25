
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/sales": "Sales",
  "/customers": "Customers",
  "/inventory": "Inventory",
  "/purchases": "Purchases",
  "/payments": "Payments & Credit",
  "/expenses": "Expenses",
  "/reports": "Reports",
  "/notes": "Notes",
  "/settings": "Settings",
  "/users": "Users",
};

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageTitle = pageTitles[location.pathname] ?? "Jira Enterprises";

  return (
    <div className="app-layout">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="main-area">
        <Header
          pageTitle={pageTitle}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
