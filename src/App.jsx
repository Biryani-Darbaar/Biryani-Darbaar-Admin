import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Layout
import AdminLayout from "./layouts/AdminLayout";

// Pages
import Login           from "./pages/Login";
import Dashboard       from "./pages/Dashboard";
import Orders          from "./pages/Orders";
import Users           from "./pages/Users";
import UserDetail      from "./pages/UserDetail";
import Dishes          from "./pages/Dishes";
import SpecialOfferMedia from "./pages/SpecialOfferMedia";
import ContactResponses  from "./pages/ContactResponses";
import NotFound        from "./pages/NotFound";

/**
 * ProtectedRoute — redirects to /login if the admin is not authenticated.
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * PublicRoute — redirects to /dashboard if the admin is already authenticated.
 */
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ──────────────────────────────────────────────────────── */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* ── Protected admin area ──────────────────────────────────────── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* Redirect root → dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="orders"           element={<Orders />} />
        <Route path="users"            element={<Users />} />
        <Route path="users/:id"        element={<UserDetail />} />
        <Route path="dishes"           element={<Dishes />} />
        <Route path="special-offers"   element={<SpecialOfferMedia />} />
        <Route path="contact-responses" element={<ContactResponses />} />
      </Route>

      {/* ── Fallbacks ─────────────────────────────────────────────────── */}
      <Route path="/404" element={<NotFound />} />
      <Route path="*"    element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
