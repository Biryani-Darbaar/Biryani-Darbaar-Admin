import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CheckCircle2, Clock, RefreshCw, X, ChevronDown, ChevronUp, Send,
} from "lucide-react";
import { ordersAPI } from "../services/api";

/**
 * Metrics ERP POS sync UI — badge, retry button, and the global alert that
 * makes failed pushes impossible to miss from any admin page.
 */

// Fired after any manual retry so every view (list, modal, alert) refreshes.
export const POS_SYNC_EVENT = "pos-sync-changed";

const POLL_MS     = 20_000; // how often the alert checks for failed orders
const REMIND_MS   = 60_000; // re-toast while failures remain
const TOAST_LIFE  = 12_000;

const AUD = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const shortId = (id = "") => `#${id.slice(-6).toUpperCase()}`;

export async function retryPosSync(orderId) {
  const res = await ordersAPI.retryPosSync(orderId);
  const posSync = res.data?.data?.posSync ?? null;
  window.dispatchEvent(new CustomEvent(POS_SYNC_EVENT, { detail: { orderId, posSync } }));
  return posSync;
}

/* ── Badge ───────────────────────────────────────────────────────────────── */
export function PosBadge({ posSync }) {
  const status = posSync?.status;
  if (!status) {
    return <span className="text-[11px] text-gray-300" title="Placed before POS integration">—</span>;
  }
  if (status === "synced") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap"
        title={posSync.syncedAt ? `Sent to POS ${new Date(posSync.syncedAt).toLocaleString("en-AU")}` : "Sent to POS"}
      >
        <CheckCircle2 size={11} /> In POS #{posSync.posOrderId}
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-red-600 text-white px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shadow-sm shadow-red-200 animate-pulse"
        title={posSync.lastError || "POS sync failed"}
      >
        <AlertTriangle size={11} /> POS sync failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
      <Clock size={11} /> Sending to POS…
    </span>
  );
}

/* ── Retry button ────────────────────────────────────────────────────────── */
export function PosRetryButton({ orderId, size = "sm", onResult }) {
  const [busy, setBusy] = useState(false);

  const run = async (e) => {
    e?.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const posSync = await retryPosSync(orderId);
      onResult?.(posSync, null);
    } catch (err) {
      onResult?.(null, err.message);
    } finally {
      setBusy(false);
    }
  };

  const cls = size === "lg"
    ? "px-4 py-2.5 text-sm gap-2"
    : "px-2.5 py-1 text-[11px] gap-1";

  return (
    <button
      onClick={run}
      disabled={busy}
      className={`inline-flex items-center justify-center rounded-lg font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors whitespace-nowrap ${cls}`}
    >
      {busy ? <RefreshCw size={size === "lg" ? 15 : 11} className="animate-spin" /> : <Send size={size === "lg" ? 15 : 11} />}
      {busy ? "Sending…" : "Retry POS push"}
    </button>
  );
}

/* ── Global alert (banner + reminder toasts + tab title) ─────────────────── */
export function PosSyncAlert() {
  const [failed,   setFailed]   = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [toasts,   setToasts]   = useState([]);
  const knownIds   = useRef(null); // null until first load, so we don't toast old failures as "new"
  const failedRef  = useRef([]);
  failedRef.current = failed;

  const pushToast = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t.slice(-2), { id, ...toast }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), TOAST_LIFE);
  }, []);

  const load = useCallback(async () => {
    try {
      const res    = await ordersAPI.getPosFailed();
      const orders = res.data?.data?.orders ?? [];
      setFailed(orders);
      const ids = new Set(orders.map((o) => o.id));
      if (knownIds.current) {
        orders.filter((o) => !knownIds.current.has(o.id)).forEach((o) =>
          pushToast({ kind: "error", title: `Order ${shortId(o.id)} didn't reach the POS`, body: o.posSync?.lastError, orderId: o.id }),
        );
      }
      knownIds.current = ids;
    } catch {
      // network blip — keep showing the last known state
    }
  }, [pushToast]);

  // Poll + refresh on manual retries anywhere in the app
  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const onChange = (e) => {
      const { posSync } = e.detail || {};
      if (posSync?.status === "synced") {
        pushToast({ kind: "success", title: `Order ${shortId(e.detail.orderId)} sent to POS`, body: `POS order #${posSync.posOrderId}` });
      }
      load();
    };
    window.addEventListener(POS_SYNC_EVENT, onChange);
    return () => { clearInterval(poll); window.removeEventListener(POS_SYNC_EVENT, onChange); };
  }, [load, pushToast]);

  // Reminder toast while anything is still failed
  useEffect(() => {
    const t = setInterval(() => {
      const n = failedRef.current.length;
      if (n > 0) {
        pushToast({
          kind: "error",
          title: `${n} order${n > 1 ? "s are" : " is"} still not in the POS`,
          body: "The kitchen may not have received them. Retry from the banner at the top.",
        });
      }
    }, REMIND_MS);
    return () => clearInterval(t);
  }, [pushToast]);

  // Tab title flag, so it's visible even when the admin is on another tab
  useEffect(() => {
    const base = document.title.replace(/^\(⚠ \d+\) /, "");
    document.title = failed.length ? `(⚠ ${failed.length}) ${base}` : base;
  }, [failed.length]);

  const retryAll = async () => {
    for (const o of failedRef.current) {
      try { await retryPosSync(o.id); } catch { /* shown via list refresh */ }
    }
  };

  return (
    <>
      {failed.length > 0 && (
        <div className="sticky top-0 z-20 border-b-2 border-red-700 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg">
          <div className="px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
            <span className="relative flex w-9 h-9 items-center justify-center rounded-full bg-white/15 flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              <AlertTriangle size={18} className="relative" />
            </span>
            <div className="flex-1 min-w-[200px]">
              <p className="font-bold text-sm leading-tight">
                {failed.length} paid order{failed.length > 1 ? "s" : ""} did not reach the POS
              </p>
              <p className="text-xs text-red-100">The kitchen may not have them. Push them again or enter them in the POS manually.</p>
            </div>
            <button onClick={retryAll} className="px-3 py-1.5 rounded-lg bg-white text-red-700 text-xs font-bold hover:bg-red-50 transition-colors">
              Retry all
            </button>
            <button
              onClick={() => setExpanded((x) => !x)}
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-bold hover:bg-white/25 transition-colors inline-flex items-center gap-1"
            >
              {expanded ? <>Hide <ChevronUp size={13} /></> : <>Show orders <ChevronDown size={13} /></>}
            </button>
          </div>

          {expanded && (
            <ul className="bg-white text-gray-800 divide-y divide-red-100 max-h-72 overflow-y-auto">
              {failed.map((o) => (
                <li key={o.id} className="px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="font-mono font-bold text-sm">{shortId(o.id)}</span>
                  <span className="text-sm text-gray-600">{o.userName || "—"}</span>
                  <span className="text-sm font-semibold">{AUD.format(o.totalPrice ?? 0)}</span>
                  <span className="text-xs text-gray-400">
                    {o.orderDate ? new Date(o.orderDate).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                  <span className="flex-1 min-w-[200px] text-xs text-red-600 truncate" title={o.posSync?.lastError}>
                    {o.posSync?.lastError}
                  </span>
                  <span className="text-[11px] text-gray-400">{o.posSync?.attempts ?? 0} attempts</span>
                  <PosRetryButton orderId={o.id} />
                </li>
              ))}
              <li className="px-6 lg:px-8 py-2 text-right">
                <Link to="/orders" className="text-xs font-semibold text-red-600 hover:underline">Open Orders page →</Link>
              </li>
            </ul>
          )}
        </div>
      )}

      {/* Toast stack */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-3 w-[340px] max-w-[calc(100vw-2.5rem)] pointer-events-none" aria-live="assertive">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl shadow-2xl border p-4 animate-[slideIn_.25s_ease-out] ${
              t.kind === "success" ? "bg-white border-emerald-200" : "bg-red-50 border-red-300 ring-2 ring-red-200"
            }`}
          >
            <div className="flex items-start gap-3">
              {t.kind === "success"
                ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                : <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{t.title}</p>
                {t.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.body}</p>}
                {t.orderId && <div className="mt-2"><PosRetryButton orderId={t.orderId} /></div>}
              </div>
              <button
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
                className="text-gray-300 hover:text-gray-500"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
