import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Truck,
  Wallet,
  Receipt,
  ChartNoAxesCombined,
  NotebookPen,
  Settings,
  UserCog,
  X,
} from "lucide-react";

import Logo from "../Logo";
import { useAuth } from "../../features/auth/useAuth";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Sales", path: "/sales", icon: ShoppingCart },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Purchases", path: "/purchases", icon: Truck },
  { label: "Payments & Credit", path: "/payments", icon: Wallet },
  { label: "Expenses", path: "/expenses", icon: Receipt },
  { label: "Reports", path: "/reports", icon: ChartNoAxesCombined },
  { label: "Notes", path: "/notes", icon: NotebookPen },
];

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { isOwner } = useAuth();

  // Only the owner can manage users; viewers can still open Settings (read-only).
  const secondaryNavigation = [
    { label: "Settings", path: "/settings", icon: Settings },
    ...(isOwner
      ? [{ label: "Users", path: "/users", icon: UserCog }]
      : []),
  ];

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={onClose} />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-card">
            <Logo />
          </div>

          <button
            className="mobile-close-btn"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-section-label">MENU</div>

        <nav className="sidebar-navigation">
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
              onClick={onClose}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-section-label secondary-label">
          PREFERENCES
        </div>

        <nav className="sidebar-navigation">
          {secondaryNavigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
              onClick={onClose}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help-card">
            <strong>Freshness Reaches You</strong>
            <p>Juice &amp; water distribution, made simple.</p>
          </div>

          <div className="sidebar-version">Business Management · v1.0</div>
        </div>
      </aside>
    </>
  );
}
