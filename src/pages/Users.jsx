import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Users as UsersIcon, ChevronRight, Phone, Mail, RefreshCw, Wallet, Plus, Minus, RotateCcw, X } from "lucide-react";
import { usersAPI } from "../services/api";

/* ── helpers ─────────────────────────────────────────────────── */
function fmt(ts) {
  if (!ts) return "—";
  const d = ts?.toDate?.() ?? new Date(ts?._seconds ? ts._seconds * 1000 : ts);
  return isNaN(d) ? "—" : d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(u) {
  const f = u.firstName?.[0] ?? u.fullName?.[0] ?? "?";
  const l = u.lastName?.[0] ?? u.fullName?.split(" ")[1]?.[0] ?? "";
  return (f + l).toUpperCase();
}

/* ── skeleton rows ───────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded animate-pulse" style={{ width: `${[60, 80, 70, 50, 30, 20][i - 1]}%` }} />
        </td>
      ))}
    </tr>
  );
}

/* ── Wallet management modal ─────────────────────────────────── */
function WalletModal({ user, onClose, onUpdated }) {
  const [action,    setAction]    = useState("increase");
  const [amount,    setAmount]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [newBalance, setNewBalance] = useState(null);

  const uid  = user.userId ?? user.id;
  const name = user.fullName ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ?? "—";
  const currentBalance = user.walletBalance ?? 0;

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const payload = { action };
      if (action !== "reset") payload.amount = parseInt(amount, 10);
      const res = await usersAPI.updateWallet(uid, payload);
      const balance = res.data?.data?.walletBalance ?? 0;
      setNewBalance(balance);
      onUpdated(uid, balance);
    } catch (e) {
      setError(e.message ?? "Failed to update wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-amber-500" />
            <span className="font-bold text-gray-900 text-sm">Manage Wallet</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* User + current balance */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">{name}</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
              🪙 {newBalance ?? currentBalance} coins
            </span>
          </div>

          {/* Action selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "increase", label: "Add",    icon: Plus,       color: "text-green-700 border-green-300 bg-green-50" },
              { value: "decrease", label: "Deduct", icon: Minus,      color: "text-red-700 border-red-300 bg-red-50" },
              { value: "reset",    label: "Reset",  icon: RotateCcw,  color: "text-gray-700 border-gray-300 bg-gray-50" },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                onClick={() => { setAction(value); setAmount(""); }}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                  action === value
                    ? color + " border-opacity-100"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Amount input */}
          {action !== "reset" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Amount (coins)
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 50"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              />
            </div>
          )}

          {/* Reset confirmation */}
          {action === "reset" && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              This will set the wallet balance to 0 coins.
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Success */}
          {newBalance !== null && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 font-semibold">
              ✓ Wallet updated — new balance: {newBalance} coins
            </p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || (action !== "reset" && !amount)}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-colors"
          >
            {loading ? "Updating…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [search, setSearch]         = useState("");
  const [walletUser, setWalletUser] = useState(null); // user whose wallet modal is open

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await usersAPI.getAll();
      // Backend returns { success, data: { users: [...], total: N } }
      // so res.data.data is an object { users, total }, not the array itself.
      const payload = res.data?.data ?? res.data ?? {};
      const data = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.users)
        ? payload.users
        : [];
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Update wallet balance locally so the table reflects changes without a reload
  const handleWalletUpdated = (uid, newBalance) => {
    setUsers((prev) =>
      prev.map((u) => (u.userId === uid || u.id === uid) ? { ...u, walletBalance: newBalance } : u)
    );
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.firstName + " " + u.lastName).toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phoneNumber?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${users.length} registered user${users.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="form-input pl-9"
        />
      </div>

      {/* ── Error ──────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-red-600 underline">Retry</button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className="admin-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-semibold text-gray-600">User</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Phone</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Joined</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Role</th>
              <th className="px-6 py-3 text-left font-semibold text-gray-600">Wallet</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <UsersIcon size={36} className="mx-auto mb-3 opacity-30" />
                    {search ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              )
              : filtered.map((u) => {
                const name = u.fullName ?? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() ?? "—";
                const uid  = u.userId ?? u.id;
                return (
                  <tr key={uid} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials(u)}
                        </div>
                        <span className="font-medium text-gray-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-gray-400" />
                        {u.email ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        {u.phoneNumber ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{fmt(u.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`badge ${u.role === "admin" ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                        {u.role ?? "user"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setWalletUser(u)}
                        className="flex items-center gap-1.5 text-amber-600 hover:text-amber-800 font-semibold text-xs bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        🪙 {u.walletBalance ?? 0}
                        <Wallet size={11} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/users/${uid}`}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium transition-colors text-xs"
                      >
                        View <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-500 bg-gray-50">
            Showing {filtered.length} of {users.length} users
            {search && ` — filtered by "${search}"`}
          </div>
        )}
      </div>

      {/* ── Wallet modal ─────────────────────────────────────────── */}
      {walletUser && (
        <WalletModal
          user={walletUser}
          onClose={() => setWalletUser(null)}
          onUpdated={handleWalletUpdated}
        />
      )}
    </div>
  );
}
