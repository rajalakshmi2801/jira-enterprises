import { useState } from "react";
import { Menu, Bell, LogOut, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ChangePinModal from "../../features/auth/ChangePinModal";
import { useAuth } from "../../features/auth/useAuth";
import { useAsync } from "../../lib/useAsync";
import { isPast } from "../../lib/format";
import { notesApi } from "../../services/business.api";

interface HeaderProps {
  onMenuClick: () => void;
  pageTitle: string;
}

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [changingPin, setChangingPin] = useState(false);

  // Red dot appears when there are pending notes whose reminder is due.
  const { data: notes } = useAsync(
    () => notesApi.list("pending").catch(() => []),
    []
  );

  const dueCount = (notes ?? []).filter((note) =>
    isPast(note.reminder_at)
  ).length;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  const displayName = user?.ownerName || "User";
  const roleLabel = user?.role === "owner" ? "Owner" : "Viewer (view only)";

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <div className="header-page-title">
          <span className="header-breadcrumb">Jira Enterprises</span>
          <h1>{pageTitle}</h1>
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-icon-button"
          aria-label="Notes and reminders"
          title={
            dueCount > 0
              ? `${dueCount} reminder(s) due`
              : "Notes and reminders"
          }
          onClick={() => navigate("/notes")}
        >
          <Bell size={19} />
          {dueCount > 0 && <span className="notification-dot" />}
        </button>

        <div className="header-profile">
          <div className="profile-avatar">
            {displayName.substring(0, 2).toUpperCase()}
          </div>

          <div className="profile-info">
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>

        <button
          className="logout-button"
          onClick={() => setChangingPin(true)}
          title="Change my PIN"
          aria-label="Change my PIN"
        >
          <KeyRound size={18} />
        </button>

        <button
          className="logout-button"
          onClick={handleLogout}
          title="Logout"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
      {changingPin && <ChangePinModal onClose={() => setChangingPin(false)} />}
    </header>
  );
}
