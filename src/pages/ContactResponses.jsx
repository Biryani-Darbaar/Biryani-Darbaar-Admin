import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Mail, Phone, Calendar, Check,
  Trash2, RefreshCw, ChevronDown, ChevronUp, X,
  Inbox,
} from "lucide-react";
import { contactAPI } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

/* ── helpers ─────────────────────────────────────────────────── */
function fmt(ts) {
  if (!ts) return "—";
  const d = ts?.toDate?.() ?? new Date(ts?._seconds ? ts._seconds * 1000 : ts);
  return isNaN(d) ? "—" : d.toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── ResponseRow ─────────────────────────────────────────────── */
function ResponseRow({ r, onMarkRead, onDelete, markingId, deletingId }) {
  const [expanded, setExpanded] = useState(false);
  const rid      = r.id ?? r.responseId;
  const isRead   = r.read === true;
  const busy     = markingId === rid || deletingId === rid;

  return (
    <div className={`border rounded-xl transition-all ${isRead ? "border-gray-200 bg-white" : "border-primary-200 bg-primary-50/30"}`}>
      {/* ── Summary row ── */}
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50/50 rounded-xl transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        {/* Unread dot */}
        <div className="pt-1 flex-shrink-0">
          {!isRead
            ? <div className="w-2.5 h-2.5 rounded-full bg-primary-600 mt-0.5" title="Unread" />
            : <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-0.5" />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className={`font-semibold text-sm ${isRead ? "text-gray-700" : "text-gray-900"}`}>
                {r.firstName} {r.lastName}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                {r.email && <span className="flex items-center gap-1"><Mail size={11} />{r.email}</span>}
                {r.phone && <span className="flex items-center gap-1"><Phone size={11} />{r.phone}</span>}
                {r.createdAt && <span className="flex items-center gap-1"><Calendar size={11} />{fmt(r.createdAt)}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
              {!isRead && (
                <button
                  onClick={() => onMarkRead(rid)}
                  disabled={busy}
                  className="btn-secondary py-1.5 px-3 text-xs gap-1"
                  title="Mark as read"
                >
                  {markingId === rid
                    ? <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <><Check size={12} /> Read</>
                  }
                </button>
              )}
              <button
                onClick={() => onDelete(rid, r)}
                disabled={busy}
                className="btn-danger py-1.5 px-3 text-xs gap-1"
                title="Delete"
              >
                {deletingId === rid
                  ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Trash2 size={12} />
                }
              </button>
              <div className="text-gray-400">
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </div>
          </div>

          {/* Message preview */}
          {!expanded && r.description && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{r.description}</p>
          )}
        </div>
      </div>

      {/* ── Expanded message ── */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-6 border-t border-gray-100 mt-0">
          <div className="mt-3 bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Message</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {r.description ?? r.message ?? "No message content."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function ContactResponses() {
  const [responses,   setResponses]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [filter,      setFilter]      = useState("all");  // all | unread | read
  const [markingId,   setMarkingId]   = useState(null);
  const [delTarget,   setDelTarget]   = useState(null);   // { id, r }
  const [deletingId,  setDeletingId]  = useState(null);
  const [confirmLoad, setConfLoad]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = filter !== "all" ? { read: filter === "read" } : {};
      const res = await contactAPI.getAll(params);
      const data = res.data?.data?.responses ?? res.data?.responses ?? res.data?.data ?? res.data ?? [];
      setResponses(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  /* ── Mark read ── */
  const handleMarkRead = async (id) => {
    setMarkingId(id);
    try {
      await contactAPI.markRead(id);
      setResponses(prev => prev.map(r => (r.id ?? r.responseId) === id ? { ...r, read: true } : r));
    } catch (e) {
      setError(e.message);
    } finally {
      setMarkingId(null);
    }
  };

  /* ── Delete ── */
  const handleDeleteClick = (id, r) => setDelTarget({ id, r });

  const handleDeleteConfirm = async () => {
    setConfLoad(true);
    const { id } = delTarget;
    setDeletingId(id);
    try {
      await contactAPI.delete(id);
      setResponses(prev => prev.filter(r => (r.id ?? r.responseId) !== id));
      setDelTarget(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setConfLoad(false);
      setDeletingId(null);
    }
  };

  const unreadCount = responses.filter(r => !r.read).length;

  const filtered = filter === "all"
    ? responses
    : filter === "unread"
    ? responses.filter(r => !r.read)
    : responses.filter(r =>  r.read);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Responses</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading…" : `${responses.length} response${responses.length !== 1 ? "s" : ""}${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2">
        {[
          { key: "all",    label: "All" },
          { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          { key: "read",   label: "Read" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              filter === key
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X size={15} /></button>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="admin-card p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-200 mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-3 bg-gray-200 rounded w-56" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-card p-16 text-center text-gray-400">
          <Inbox size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg">
            {filter === "all" ? "No responses yet" : `No ${filter} responses`}
          </p>
          <p className="text-sm mt-1">
            {filter === "all"
              ? "Responses from the Contact & Catering form will appear here."
              : `Switch to "All" to see all responses.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <ResponseRow
              key={r.id ?? r.responseId}
              r={r}
              onMarkRead={handleMarkRead}
              onDelete={handleDeleteClick}
              markingId={markingId}
              deletingId={deletingId}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!delTarget}
        title="Delete Response"
        message={`Delete the response from ${delTarget?.r?.firstName ?? "this user"}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={confirmLoad}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDelTarget(null)}
      />
    </div>
  );
}
