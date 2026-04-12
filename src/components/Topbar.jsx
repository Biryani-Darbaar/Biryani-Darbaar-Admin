import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu, LogOut, User, ShoppingBag,
  Clock, UtensilsCrossed, Truck, CheckCircle2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { ordersAPI } from "../services/api";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Page title map ──────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  "/dashboard":         "Dashboard",
  "/orders":            "Orders",
  "/users":             "Users",
  "/dishes":            "Dishes",
  "/special-offers":    "Special Offers",
  "/contact-responses": "Contact Responses",
};

// ── Active-status colour map ────────────────────────────────────────────────────
const STATUS_STYLE = {
  confirmed:        { bg: "bg-slate-100",  text: "text-slate-700",  label: "Confirmed"     },
  preparing:        { bg: "bg-sky-100",    text: "text-sky-700",    label: "Preparing"     },
  packed:           { bg: "bg-amber-100",  text: "text-amber-700",  label: "Packed"        },
  out_for_delivery: { bg: "bg-purple-100", text: "text-purple-700", label: "Out for Del."  },
  delivered:        { bg: "bg-green-100",  text: "text-green-700",  label: "Delivered"     },
};

const STATUS_ICON = {
  confirmed:        <Clock         size={12} />,
  preparing:        <UtensilsCrossed size={12} />,
  packed:           <ShoppingBag   size={12} />,
  out_for_delivery: <Truck         size={12} />,
  delivered:        <CheckCircle2  size={12} />,
};

// Active statuses only (delivered/cancelled are excluded from the widget)
const ACTIVE_STATUSES = ["confirmed", "preparing", "packed", "out_for_delivery"];

// ── ActiveOrdersBadge ───────────────────────────────────────────────────────────
// Polls /admin/orders every 5 s, shows a compact dropdown of active orders.
// Rendered only when isAuthenticated — rendered inside ProtectedRoute anyway,
// but guarded here explicitly as an additional safety net.

function ActiveOrdersBadge() {
  const { isAuthenticated } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [open, setOpen]                 = useState(false);
  const dropdownRef                     = useRef(null);

  const fetchActive = useCallback(async () => {
    try {
      const res  = await ordersAPI.getAll({ limit: 100 });
      const data = res.data?.data ?? res.data;
      const all  = Array.isArray(data?.orders) ? data.orders : [];
      setActiveOrders(
        all.filter((o) => ACTIVE_STATUSES.includes(o.orderStatus)),
      );
    } catch {
      // silently skip — badge is non-critical
    }
  }, []);

  // Initial load + 5-second refresh (same cadence as Orders page)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchActive();
    const id = setInterval(fetchActive, 5_000);
    return () => clearInterval(id);
  }, [isAuthenticated, fetchActive]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!isAuthenticated || activeOrders.length === 0) return null;

  const AUD = new Intl.NumberFormat("en-AU", {
    style: "currency", currency: "AUD", maximumFractionDigits: 0,
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ── Badge button ─────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors border border-primary-200"
        title={`${activeOrders.length} active order${activeOrders.length !== 1 ? "s" : ""}`}
      >
        <ShoppingBag size={15} className="text-primary-600" />
        <span className="text-xs font-bold text-primary-700 tabular-nums">
          {activeOrders.length}
        </span>
        {/* Live pulse dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600" />
        </span>
      </button>

      {/* ── Dropdown panel ───────────────────────────────────────── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Active Orders</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-600 text-white">
                {activeOrders.length}
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              Live
            </span>
          </div>

          {/* Order list */}
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {activeOrders.map((order) => {
              const style = STATUS_STYLE[order.orderStatus] ?? STATUS_STYLE.confirmed;
              const icon  = STATUS_ICON[order.orderStatus]  ?? STATUS_ICON.confirmed;
              const shortId = `#${(order.id ?? "").slice(-6).toUpperCase()}`;
              const items = Array.isArray(order.items)
                ? order.items
                : Array.isArray(order.orderItems)
                  ? order.orderItems
                  : [];

              return (
                <li key={order.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    {/* Order ID */}
                    <span className="font-mono font-bold text-gray-800 text-xs">{shortId}</span>

                    {/* Status badge */}
                    <span
                      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                    >
                      {icon}
                      {style.label}
                    </span>
                  </div>

                  {/* Items count + total */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {items.length > 0
                        ? `${items.length} item${items.length !== 1 ? "s" : ""}`
                        : "—"}
                    </span>
                    {order.totalPrice != null && (
                      <span className="text-xs font-semibold text-gray-700 tabular-nums">
                        {AUD.format(order.totalPrice)}
                      </span>
                    )}
                  </div>

                  {/* User ID (truncated) */}
                  {order.userId && (
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                      {order.userId.slice(0, 16)}…
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer hint */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/60">
            <p className="text-[10px] text-gray-400 text-center">
              Updates every 5 seconds · View full details in Orders
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Topbar ──────────────────────────────────────────────────────────────────────

export default function Topbar({ onMenuClick }) {
  const { admin, isAuthenticated, logout } = useAuth();
  const location   = useLocation();
  const navigate   = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  // Derive page title — handles /users/:id too
  const title =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith("/users/") ? "User Detail" : "Admin");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 z-10">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      </div>

      {/* Right: active orders badge + admin info + logout */}
      <div className="flex items-center gap-3">

        {/* Active orders badge — only renders when authenticated + orders exist */}
        {isAuthenticated && <ActiveOrdersBadge />}

        {/* Admin avatar / name */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-primary-600" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {admin?.firstName || "Admin"}
              </p>
              <p className="text-xs text-gray-400 leading-tight capitalize">
                {admin?.role || "admin"}
              </p>
            </div>
          </button>

          {/* Dropdown */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {admin?.firstName} {admin?.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{admin?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
