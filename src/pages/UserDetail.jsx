import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  ShoppingBag, DollarSign, Eye, RefreshCw,
} from "lucide-react";
import { usersAPI } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import OrderDetailModal from "../components/OrderDetailModal";

/* ── helpers ─────────────────────────────────────────────────── */
const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });

function fmt(ts, opts = {}) {
  if (!ts) return "—";
  const d = ts?.toDate?.() ?? new Date(ts?._seconds ? ts._seconds * 1000 : ts);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric", ...opts });
}

function fmtFull(ts) {
  if (!ts) return "—";
  const d = ts?.toDate?.() ?? new Date(ts?._seconds ? ts._seconds * 1000 : ts);
  return isNaN(d) ? "—" : d.toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function initials(u) {
  const f = u?.firstName?.[0] ?? u?.fullName?.[0] ?? "?";
  const l = u?.lastName?.[0] ?? u?.fullName?.split(" ")[1]?.[0] ?? "";
  return (f + l).toUpperCase();
}

/* ── Stat card ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color = "blue" }) {
  const colors = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <div className="admin-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function UserDetail() {
  const { id } = useParams();
  const [data, setData]         = useState(null);   // { user, orders }
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [modalOrder, setModal]  = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await usersAPI.getOrders(id);
      const payload = res.data?.data ?? res.data;
      setData(payload);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  /* ── Loading ─── */
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        <div className="admin-card p-6 flex gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="admin-card p-5 h-20 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="admin-card h-48" />
      </div>
    );
  }

  /* ── Error ─── */
  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/users" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Back to Users
        </Link>
        <div className="admin-card p-8 text-center">
          <p className="text-red-600 font-medium mb-3">{error}</p>
          <button onClick={load} className="btn-primary gap-2">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const user   = data?.user ?? {};
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const _rawName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(); const name = user.fullName ?? (_rawName || "Unknown User");
  const total  = orders.reduce((s, o) => s + (parseFloat(o.totalAmount ?? o.total ?? 0) || 0), 0);

  const handleStatusChange = (orderId, newStatus) => {
    setData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId || o.orderId === orderId ? { ...o, orderStatus: newStatus } : o),
    }));
    if (modalOrder?.id === orderId || modalOrder?.orderId === orderId) {
      setModal(prev => ({ ...prev, orderStatus: newStatus }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Back ──────────────────────────────────────────────── */}
      <Link to="/users" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft size={14} /> Back to Users
      </Link>

      {/* ── Profile card ──────────────────────────────────────── */}
      <div className="admin-card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 text-xl font-bold flex items-center justify-center flex-shrink-0">
            {initials(user)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              <span className={`badge border ${user.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {user.role ?? "user"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
              {user.email && (
                <span className="flex items-center gap-2"><Mail size={14} className="text-gray-400 flex-shrink-0" />{user.email}</span>
              )}
              {user.phoneNumber && (
                <span className="flex items-center gap-2"><Phone size={14} className="text-gray-400 flex-shrink-0" />{user.phoneNumber}</span>
              )}
              {user.address && (
                <span className="flex items-center gap-2 sm:col-span-2"><MapPin size={14} className="text-gray-400 flex-shrink-0" />{user.address}</span>
              )}
              {user.createdAt && (
                <span className="flex items-center gap-2"><Calendar size={14} className="text-gray-400 flex-shrink-0" />Joined {fmt(user.createdAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ShoppingBag}  label="Total Orders"  value={orders.length}        color="blue"   />
        <StatCard icon={DollarSign}   label="Total Spent"   value={AUD.format(total)}    color="green"  />
        <StatCard icon={User}         label="User ID"       value={id.slice(0, 8) + "…"} color="purple" />
      </div>

      {/* ── Order history ─────────────────────────────────────── */}
      <div className="admin-card overflow-hidden">
        <div className="admin-card-header flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Order History</h3>
          <span className="text-sm text-gray-500">{orders.length} order{orders.length !== 1 ? "s" : ""}</span>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <ShoppingBag size={36} className="mx-auto mb-3 opacity-30" />
            <p>No orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Order ID</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const oid = o.id ?? o.orderId ?? o.orderNumber;
                const amount = parseFloat(o.totalAmount ?? o.total ?? 0) || 0;
                return (
                  <tr key={oid} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-700">{oid?.slice(0, 10)}…</td>
                    <td className="px-6 py-4 text-gray-600">{fmtFull(o.createdAt ?? o.orderDate)}</td>
                    <td className="px-6 py-4"><StatusBadge status={o.orderStatus} /></td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">{AUD.format(amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setModal({ ...o, userId: id })}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium text-xs transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {modalOrder && (
        <OrderDetailModal
          order={modalOrder}
          onClose={() => setModal(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
