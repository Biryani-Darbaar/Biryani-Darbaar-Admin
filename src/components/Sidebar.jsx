import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingBag,
  Radio,
  Users,
  UtensilsCrossed,
  Film,
  MessageSquare,
  X,
  ChefHat,
} from "lucide-react";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    to: "/orders",
    icon: ShoppingBag,
  },
  {
    label: "Users",
    to: "/users",
    icon: Users,
  },
  {
    label: "Dishes",
    to: "/dishes",
    icon: UtensilsCrossed,
  },
  {
    label: "Special Offers",
    to: "/special-offers",
    icon: Film,
  },
  {
    label: "Contact Responses",
    to: "/contact-responses",
    icon: MessageSquare,
  },
];

export default function Sidebar({ open, onClose }) {
  const location = useLocation();

  return (
    <>
      {/* ── Sidebar panel ──────────────────────────────────────────────── */}
      <aside
        className={[
          // Base styles
          "fixed top-0 left-0 h-full w-64 bg-gray-900 flex flex-col z-30",
          "transform transition-transform duration-200 ease-in-out",
          // Mobile: slide in/out; Desktop: always visible
          "lg:relative lg:translate-x-0 lg:flex",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* ── Brand header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <ChefHat size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Biryani Darbaar</p>
              <p className="text-gray-400 text-xs leading-tight">Admin Panel</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ label, to, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                  isActive
                    ? "bg-primary-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                ].join(" ")
              }
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white animate-pulse">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div className="px-5 py-4 border-t border-gray-700 flex-shrink-0">
          <p className="text-gray-500 text-xs text-center">
            © {new Date().getFullYear()} Biryani Darbaar
          </p>
        </div>
      </aside>
    </>
  );
}
