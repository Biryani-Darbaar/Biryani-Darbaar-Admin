import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ShoppingBag, Search, Filter, X, Download,
  RefreshCw, Eye, ChevronUp, ChevronDown, AlertCircle,
  ChevronsUpDown,
} from "lucide-react";
import { ordersAPI } from "../services/api";
import StatusBadge, { STATUS_LABELS } from "../components/StatusBadge";
import OrderDetailModal from "../components/OrderDetailModal";

// ─────────────────────────────────────────────────────────────────────────────
const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", maximumFractionDigits: 2,
});
const NUM = new Intl.NumberFormat("en-AU");

const ALL_STATUSES = [
  "pending", "confirmed", "preparing", "packed",
  "out_for_delivery", "delivered", "cancelled",
];

function Skeleton({ className = "" }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable column header
// ─────────────────────────────────────────────────────────────────────────────
function SortHeader({ label, field, sort, onSort }) {
  const active = sort.field === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-600 transition-colors select-none"
    >
      {label}
      {active
        ? sort.dir === "asc"
          ? <ChevronUp size={12} />
          : <ChevronDown size={12} />
        : <ChevronsUpDown size={12} className="opacity-40" />
      }
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export orders to CSV
// ─────────────────────────────────────────────────────────────────────────────
function exportCSV(orders) {
  const headers = ["Order ID", "User ID", "Items", "Total (AUD)", "Status", "Payment Verified", "Date"];
  const rows = orders.map((o) => [
    o.id ?? "",
    o.userId ?? "",
    (Array.isArray(o.items) ? o.items : Array.isArray(o.orderItems) ? o.orderItems : []).length,
    o.totalPrice ?? 0,
    o.orderStatus ?? "",
    o.paymentVerified ? "Yes" : "No",
    o.orderDate ? new Date(o.orderDate).toLocaleString("en-AU") : "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), {
    href:     url,
    download: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function Orders() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [minAmt,   setMinAmt]   = useState("");
  const [maxAmt,   setMaxAmt]   = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sort, setSort] = useState({ field: "orderDate", dir: "desc" });

  // ── Detail modal ──────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const params = { limit: 200 };
      if (status)   params.status   = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;

      const res  = await ordersAPI.getAll(params);
      const data = res.data?.data ?? res.data;
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, dateFrom, dateTo]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Auto-refresh every 5 s (silent — no spinner) ─────────────────────────
  useEffect(() => {
    const id = setInterval(() => fetchOrders(true), 5_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  // ── Sort handler ──────────────────────────────────────────────────────────
  const handleSort = (field) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  };

  // ── Status update callback (optimistic from modal) ────────────────────────
  const handleStatusChange = useCallback((id, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => o.id === id ? { ...o, orderStatus: newStatus } : o)
    );
    setSelectedOrder((prev) =>
      prev?.id === id ? { ...prev, orderStatus: newStatus } : prev
    );
  }, []);

  // ── Derived: filter + sort ────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Client-side: text search (id, userId)
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (o) =>
          (o.id ?? "").toLowerCase().includes(q) ||
          (o.userId ?? "").toLowerCase().includes(q)
      );
    }

    // Client-side: amount range
    if (minAmt !== "") result = result.filter((o) => (o.totalPrice ?? 0) >= Number(minAmt));
    if (maxAmt !== "") result = result.filter((o) => (o.totalPrice ?? 0) <= Number(maxAmt));

    // Sort
    result.sort((a, b) => {
      let aVal = a[sort.field];
      let bVal = b[sort.field];
      if (sort.field === "orderDate") {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sort.field === "totalPrice") {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }
      if (aVal < bVal) return sort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.dir === "asc" ?  1 : -1;
      return 0;
    });

    return result;
  }, [orders, search, minAmt, maxAmt, sort]);

  const hasActiveFilters = status || dateFrom || dateTo || search || minAmt || maxAmt;

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setMinAmt("");
    setMaxAmt("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${NUM.format(filteredOrders.length)} order${filteredOrders.length !== 1 ? "s" : ""}${hasActiveFilters ? " (filtered)" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="btn-secondary text-xs py-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => exportCSV(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="btn-secondary text-xs py-1.5"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Search + Filter bar ───────────────────────────────────────── */}
      <div className="admin-card p-4 space-y-3">
        <div className="flex gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Order ID or User ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-9 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status quick-filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="form-select h-9 text-sm w-44"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>

          {/* Toggle advanced filters */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-secondary text-xs py-1.5 ${showFilters ? "bg-gray-100 border-gray-300" : ""}`}
          >
            <Filter size={13} />
            Filters{hasActiveFilters && (
              <span className="ml-1 w-4 h-4 bg-primary-600 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                !
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-secondary text-xs py-1.5 text-red-600 border-red-200 hover:bg-red-50"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="form-label text-xs">Date from</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="form-input h-9 text-sm" />
            </div>
            <div>
              <label className="form-label text-xs">Date to</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="form-input h-9 text-sm" />
            </div>
            <div>
              <label className="form-label text-xs">Min amount ($)</label>
              <input type="number" placeholder="0" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} className="form-input h-9 text-sm" min="0" />
            </div>
            <div>
              <label className="form-label text-xs">Max amount ($)</label>
              <input type="number" placeholder="∞" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} className="form-input h-9 text-sm" min="0" />
            </div>
          </div>
        )}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => fetchOrders()} className="btn-secondary text-xs py-1">Retry</button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="py-3 px-4 text-left">
                  <SortHeader label="Order ID"    field="id"          sort={sort} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-left">
                  <SortHeader label="User ID"     field="userId"      sort={sort} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Items
                </th>
                <th className="py-3 px-4 text-right">
                  <SortHeader label="Total"       field="totalPrice"  sort={sort} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-left">
                  <SortHeader label="Status"      field="orderStatus" sort={sort} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-left">
                  <SortHeader label="Date"        field="orderDate"   sort={sort} onSort={handleSort} />
                </th>
                <th className="py-3 px-4 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  View
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {/* Loading skeleton */}
              {loading && [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((__, j) => (
                    <td key={j} className="py-3.5 px-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty state */}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <ShoppingBag size={36} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-500">
                      {hasActiveFilters ? "No orders match your filters" : "No orders yet"}
                    </p>
                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="mt-3 btn-secondary text-xs py-1.5">
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}

              {/* Rows */}
              {!loading && filteredOrders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onView={() => setSelectedOrder(order)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {!loading && filteredOrders.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-gray-400">
              Showing {NUM.format(filteredOrders.length)} order{filteredOrders.length !== 1 ? "s" : ""}
              {hasActiveFilters ? " (filtered)" : ""}
              {" · "}Total value: <span className="font-semibold text-gray-600">
                {AUD.format(filteredOrders.reduce((s, o) => s + (o.totalPrice ?? 0), 0))}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* ── Order detail modal ────────────────────────────────────────── */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table row
// ─────────────────────────────────────────────────────────────────────────────
function OrderRow({ order, onView, onStatusChange }) {
  const [localStatus, setLocalStatus] = useState(order.orderStatus);
  const [updating,    setUpdating]    = useState(false);
  const selectRef = useRef(null);

  // Backend normalises "orderItems" → "items"; defensive fallback for old docs.
  const itemArr  = Array.isArray(order.items) ? order.items
                 : Array.isArray(order.orderItems) ? order.orderItems
                 : null;
  const itemCount = itemArr !== null ? itemArr.length : "—";
  const shortId   = `#${(order.id ?? "").slice(-6).toUpperCase()}`;
  const shortUser = order.userId ? `${order.userId.slice(0, 8)}…` : "—";
  const date      = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-AU", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === localStatus) return;
    setUpdating(true);
    try {
      await ordersAPI.updateStatus(order.id, newStatus, order.userId);
      setLocalStatus(newStatus);
      onStatusChange(order.id, newStatus);
    } catch {
      // revert silently
    } finally {
      setUpdating(false);
    }
  };

  return (
    <tr className="hover:bg-gray-50/70 transition-colors group">
      {/* Order ID */}
      <td className="py-3 px-4">
        <span className="font-mono font-bold text-gray-800 text-xs">{shortId}</span>
      </td>

      {/* User ID */}
      <td className="py-3 px-4">
        <span className="text-xs text-gray-500 font-mono" title={order.userId}>{shortUser}</span>
      </td>

      {/* Items count */}
      <td className="py-3 px-4 text-center">
        <span className="text-xs text-gray-600 font-semibold">{itemCount}</span>
      </td>

      {/* Total */}
      <td className="py-3 px-4 text-right">
        <span className="font-bold text-gray-900 tabular-nums">{AUD.format(order.totalPrice ?? 0)}</span>
      </td>

      {/* Status — inline select */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={localStatus} />
          {updating && (
            <RefreshCw size={12} className="animate-spin text-gray-400 flex-shrink-0" />
          )}
        </div>
        {/* Hidden select — triggered by clicking the badge area */}
        <select
          ref={selectRef}
          value={localStatus}
          onChange={handleStatusChange}
          disabled={updating}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          aria-label="Update status"
        />
      </td>

      {/* Date */}
      <td className="py-3 px-4">
        <span className="text-xs text-gray-500">{date}</span>
      </td>

      {/* View button */}
      <td className="py-3 px-4 text-center">
        <button
          onClick={onView}
          className="w-8 h-8 flex items-center justify-center mx-auto text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="View details"
        >
          <Eye size={15} />
        </button>
      </td>
    </tr>
  );
}
