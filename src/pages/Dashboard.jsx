import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ShoppingBag, Users, DollarSign, Radio,
  TrendingUp, RefreshCw, AlertCircle, ArrowUpRight,
  Clock, CalendarDays, Package, CheckCircle2,
} from "lucide-react";
import { dashboardAPI } from "../services/api";
import StatusBadge, { STATUS_COLORS, STATUS_LABELS } from "../components/StatusBadge";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 30_000;   // 30 seconds
const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2 });
const NUM  = new Intl.NumberFormat("en-AU");

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Loading skeleton block */
function Skeleton({ className = "" }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

/** One stat tile in the top row */
function StatCard({ icon: Icon, label, value, sub, color, loading, to }) {
  const inner = (
    <div className={`admin-card p-5 flex items-start gap-4 transition-shadow ${to ? "hover:shadow-md" : ""}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {loading
          ? <Skeleton className="h-8 w-28 mt-1" />
          : <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 tabular-nums truncate">{value}</p>
        }
        {sub && !loading && (
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        )}
      </div>
      {to && !loading && (
        <ArrowUpRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
      )}
    </div>
  );

  return to ? <Link to={to}>{inner}</Link> : inner;
}

/** Custom tooltip shared by all recharts */
function ChartTooltip({ active, payload, label, prefix = "", suffix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {prefix}{typeof p.value === "number" ? NUM.format(p.value) : p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

/** Pie chart custom label */
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const r  = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      className="text-xs font-semibold" fontSize={11}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/** Single row in recent orders mini-table */
function OrderRow({ order, index }) {
  const date = order.orderDate
    ? new Date(order.orderDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
  const itemsCount = Array.isArray(order.items) ? order.items.length : "—";
  const shortId = order.id ? `#${order.id.slice(-6).toUpperCase()}` : "—";

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-2.5 px-4 text-xs text-gray-400 font-mono">{shortId}</td>
      <td className="py-2.5 px-4 text-xs text-gray-600">{itemsCount} item{itemsCount !== 1 ? "s" : ""}</td>
      <td className="py-2.5 px-4 text-xs font-semibold text-gray-900 tabular-nums">
        {AUD.format(order.totalPrice ?? 0)}
      </td>
      <td className="py-2.5 px-4">
        <StatusBadge status={order.orderStatus} />
      </td>
      <td className="py-2.5 px-4 text-xs text-gray-400">{date}</td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [countdown,   setCountdown]   = useState(REFRESH_INTERVAL_MS / 1000);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading((prev) => (data ? false : prev));   // keep spinner only on first load
    if (silent)  setRefreshing(true);
    try {
      const res  = await dashboardAPI.getStats();
      const raw  = res.data?.data ?? res.data;
      setData(raw);
      setError(null);
      setLastUpdated(new Date());
      setCountdown(REFRESH_INTERVAL_MS / 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  // Initial load + auto-refresh
  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);   // eslint-disable-line

  // Countdown ticker
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL_MS / 1000 : c - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  // ── Derived data ───────────────────────────────────────────────────────────

  // Status breakdown → PieChart array
  const pieData = data?.statusBreakdown
    ? Object.entries(data.statusBreakdown)
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({
          name:  STATUS_LABELS[key] ?? key,
          value,
          color: STATUS_COLORS[key] ?? "#94a3b8",
          key,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle size={28} className="text-red-500" />
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">Failed to load dashboard</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
        <button onClick={() => fetchStats()} className="btn-primary">
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  const d = data ?? {};

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Live overview of Biryani Darbaar operations</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={12} />
              <span>Refreshes in <span className="tabular-nums font-semibold text-gray-600">{countdown}s</span></span>
            </div>
          )}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="btn-secondary text-xs py-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Soft error banner (stale data) ──────────────────────────────── */}
      {error && data && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle size={15} />
          <span>Could not refresh: {error}. Showing last known data.</span>
        </div>
      )}

      {/* ── Primary stat cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={NUM.format(d.totalOrders ?? 0)}
          sub={`${NUM.format(d.todayOrdersCount ?? 0)} today`}
          color="bg-blue-500"
          to="/orders"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={AUD.format(d.totalRevenue ?? 0)}
          sub="All confirmed orders"
          color="bg-emerald-500"
        />
        <StatCard
          icon={Users}
          label="Total Users"
          value={NUM.format(d.totalUsers ?? 0)}
          sub="Registered accounts"
          color="bg-violet-500"
          to="/users"
        />
        <StatCard
          icon={Radio}
          label="Active Orders"
          value={NUM.format(d.activeOrdersCount ?? 0)}
          sub="In progress right now"
          color="bg-rose-500"
          to="/orders/live"
        />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Daily orders bar chart — 3/5 width */}
        <div className="lg:col-span-3 admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Daily Orders</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 days</p>
            </div>
            <CalendarDays size={16} className="text-gray-300" />
          </div>
          <div className="admin-card-body">
            {(d.dailyData?.length ?? 0) === 0 ? (
              <EmptyChart message="No order data yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip suffix=" orders" />} cursor={{ fill: "#f8fafc" }} />
                  <Bar
                    dataKey="orders"
                    name="Orders"
                    fill="#dc2626"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status breakdown pie chart — 2/5 width */}
        <div className="lg:col-span-2 admin-card">
          <div className="admin-card-header flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Order Status</h3>
              <p className="text-xs text-gray-400 mt-0.5">All-time breakdown</p>
            </div>
            <Package size={16} className="text-gray-300" />
          </div>
          <div className="admin-card-body">
            {pieData.length === 0 ? (
              <EmptyChart message="No orders yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={PieLabel}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) =>
                        active && payload?.length ? (
                          <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
                            <p className="font-semibold" style={{ color: payload[0].payload.color }}>
                              {payload[0].payload.name}
                            </p>
                            <p className="text-gray-600">{NUM.format(payload[0].value)} orders</p>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="mt-2 space-y-1.5">
                  {pieData.slice(0, 5).map((entry) => (
                    <div key={entry.key} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-600">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-gray-800 tabular-nums">{NUM.format(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Monthly revenue area chart ───────────────────────────────────── */}
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Monthly Revenue</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 6 months (AUD)</p>
          </div>
          <TrendingUp size={16} className="text-gray-300" />
        </div>
        <div className="admin-card-body">
          {(d.monthlyData?.length ?? 0) === 0 ? (
            <EmptyChart message="No revenue data yet" height={180} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={d.monthlyData} margin={{ top: 4, right: 4, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm">
                        <p className="font-semibold text-gray-700 mb-1">{label}</p>
                        <p className="text-emerald-600 font-bold">{AUD.format(payload[0].value)}</p>
                      </div>
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ fill: "#dc2626", r: 4, strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, fill: "#dc2626" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent orders ────────────────────────────────────────────────── */}
      <div className="admin-card">
        <div className="admin-card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 10 orders</p>
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            View all <ArrowUpRight size={12} />
          </Link>
        </div>

        {(!d.recentOrders || d.recentOrders.length === 0) ? (
          <div className="p-8 text-center">
            <ShoppingBag size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400 font-medium">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Order ID</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Total</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {d.recentOrders.map((order, i) => (
                  <OrderRow key={order.id ?? i} order={order} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Summary footer ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat
          icon={CheckCircle2}
          color="text-emerald-500"
          bg="bg-emerald-50"
          label="Delivered"
          value={NUM.format(d.statusBreakdown?.delivered ?? 0)}
        />
        <MiniStat
          icon={Package}
          color="text-amber-500"
          bg="bg-amber-50"
          label="In Progress"
          value={NUM.format(d.activeOrdersCount ?? 0)}
        />
        <MiniStat
          icon={CalendarDays}
          color="text-blue-500"
          bg="bg-blue-50"
          label="Orders Today"
          value={NUM.format(d.todayOrdersCount ?? 0)}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper sub-components
// ─────────────────────────────────────────────────────────────────────────────

function EmptyChart({ message = "No data", height = 220 }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ height }}
    >
      <TrendingUp size={28} className="text-gray-200 mb-2" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, color, bg, label, value }) {
  return (
    <div className={`rounded-xl p-4 ${bg} flex items-center gap-3`}>
      <div className={`flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-black text-gray-900 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

/** Full-page loading skeleton shown on first load */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="admin-card p-5 flex items-start gap-4">
            <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 admin-card">
          <div className="admin-card-header"><Skeleton className="h-5 w-32" /></div>
          <div className="admin-card-body"><Skeleton className="h-52 w-full rounded-lg" /></div>
        </div>
        <div className="lg:col-span-2 admin-card">
          <div className="admin-card-header"><Skeleton className="h-5 w-28" /></div>
          <div className="admin-card-body"><Skeleton className="h-52 w-full rounded-lg" /></div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><Skeleton className="h-5 w-40" /></div>
        <div className="admin-card-body"><Skeleton className="h-48 w-full rounded-lg" /></div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><Skeleton className="h-5 w-32" /></div>
        <div className="admin-card-body space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
