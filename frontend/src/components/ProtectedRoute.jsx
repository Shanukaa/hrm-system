import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * Wrap a page element with this to require login, and optionally a
 * specific set of roles: <ProtectedRoute roles={["admin"]}><Users /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-sm text-muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-8">
        <p className="font-display text-xl text-ink mb-1">Not authorized</p>
        <p className="text-sm text-muted">Your account doesn't have access to this page.</p>
      </div>
    );
  }
  return children;
}
