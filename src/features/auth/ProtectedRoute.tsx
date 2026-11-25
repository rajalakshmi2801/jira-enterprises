import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./useAuth.ts";

export default function ProtectedRoute({
  ownerOnly = false,
}: {
  ownerOnly?: boolean;
}) {
  const { isAuthenticated, isOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="loading-spinner" />
        <p>Checking your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (ownerOnly && !isOwner) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
