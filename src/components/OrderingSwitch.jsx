import { useEffect, useState, useSyncExternalStore } from "react";
import { PauseCircle, PlayCircle } from "lucide-react";
import { settingsAPI } from "../services/api";
import ConfirmDialog from "./ConfirmDialog";

/*
 * Online ordering ON/OFF — the website and API read the same switch
 * (server: settings/ordering). OFF = the website stops taking orders.
 * One shared store for the Topbar switch and the layout banner; refreshed
 * every 30 s and on window focus so several open admin tabs stay in sync.
 */
const POLL_MS = 30_000;
let state = { open: null, saving: false, error: "" }; // open: null until first load
const subs = new Set();
const emit = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };

const refresh = async () => {
  try {
    const res = await settingsAPI.getOrdering();
    emit({ open: res.data?.data?.open !== false, error: "" });
  } catch {
    emit({ error: "Couldn't load the online ordering status" });
  }
};

const setOpen = async (open) => {
  emit({ saving: true, error: "" });
  try {
    const res = await settingsAPI.setOrdering(open);
    emit({ open: res.data?.data?.open !== false, saving: false });
    return true;
  } catch (err) {
    emit({ saving: false, error: err.response?.data?.message || "Couldn't change online ordering. Try again." });
    return false;
  }
};

const subscribe = (cb) => {
  subs.add(cb);
  if (subs.size === 1) {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    window.addEventListener("focus", refresh);
    subscribe.stop = () => { clearInterval(id); window.removeEventListener("focus", refresh); };
  }
  return () => { subs.delete(cb); if (!subs.size) subscribe.stop?.(); };
};

const useOrdering = () => useSyncExternalStore(subscribe, () => state);

/* ── Topbar switch ──────────────────────────────────────────────────────── */
export function OrderingSwitch() {
  const { open, saving, error } = useOrdering();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  if (open === null) return null; // not loaded yet

  const turnOn = async () => {
    if (await setOpen(true)) setNotice("Online orders are back on.");
  };
  const turnOff = async () => {
    if (await setOpen(false)) {
      setConfirming(false);
      setNotice("Online orders are now off.");
    }
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={open}
        aria-label="Online orders"
        disabled={saving}
        onClick={() => (open ? setConfirming(true) : turnOn())}
        title={open ? "Customers can order on the website. Click to stop." : "Online ordering is off. Click to turn it back on."}
        className={`flex items-center gap-2.5 rounded-full border pl-3 pr-1.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          open
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        }`}
      >
        <span className="whitespace-nowrap">
          <span className="hidden md:inline">Online orders </span>
          <span className="md:hidden">Orders </span>
          {open ? "ON" : "OFF"}
        </span>
        <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${open ? "bg-emerald-500" : "bg-red-500"}`}>
          <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${open ? "translate-x-[22px]" : "translate-x-0.5"}`} />
        </span>
      </button>

      <ConfirmDialog
        isOpen={confirming}
        title="Stop taking online orders?"
        message={
          <>
            Customers won't be able to place orders or pay on the website until you turn this back on.
            Orders that are already paid are not affected.
            {error && <span className="mt-2 block text-red-600">{error}</span>}
          </>
        }
        confirmLabel="Stop orders"
        cancelLabel="Keep taking orders"
        variant="danger"
        loading={saving}
        onConfirm={turnOff}
        onCancel={() => setConfirming(false)}
      />

      {(notice || (error && !confirming)) && (
        <div role="status" className={`fixed bottom-5 right-5 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${error && !notice ? "bg-red-600" : "bg-gray-900"}`}>
          {notice || error}
        </div>
      )}
    </>
  );
}

/* ── Layout banner while OFF ────────────────────────────────────────────── */
export function OrderingOffBanner() {
  const { open, saving } = useOrdering();
  if (open !== false) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-600 px-4 py-2.5 text-white lg:px-6">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PauseCircle size={18} className="shrink-0" />
        Online ordering is OFF — customers can't place orders on the website.
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        <PlayCircle size={16} /> Turn on
      </button>
    </div>
  );
}
