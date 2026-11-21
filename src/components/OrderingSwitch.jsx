import { useEffect, useState, useSyncExternalStore } from "react";
import { Package, PauseCircle, PlayCircle, Truck } from "lucide-react";
import { settingsAPI } from "../services/api";
import ConfirmDialog from "./ConfirmDialog";

/*
 * Online ordering switches — the website and API read the same doc
 * (server: settings/ordering): master ON/OFF plus Pickup and Delivery.
 * The server applies the linked rules (both methods off → ordering off, etc.)
 * and returns the resulting state, so this store just mirrors it.
 * One shared store for the Topbar switches and the layout banner; refreshed
 * every 30 s and on window focus so several open admin tabs stay in sync.
 */
const POLL_MS = 30_000;
const LABEL = { pickup: "Pickup", delivery: "Delivery" };
const ICON = { pickup: Package, delivery: Truck };
const other = (m) => (m === "pickup" ? "delivery" : "pickup");

let state = { open: null, pickup: true, delivery: true, autoClosed: false, saving: false, error: "" }; // open: null until first load
const subs = new Set();
const emit = (patch) => { state = { ...state, ...patch }; subs.forEach((f) => f()); };
const fromServer = (d = {}) => ({
  open: d.open !== false, pickup: d.pickup !== false, delivery: d.delivery !== false, autoClosed: d.autoClosed === true,
});

const refresh = async () => {
  try {
    const res = await settingsAPI.getOrdering();
    emit({ ...fromServer(res.data?.data), error: "" });
  } catch {
    emit({ error: "Couldn't load the online ordering status" });
  }
};

/** Send one change ({ open } | { pickup } | { delivery }); resolves to the new state or null. */
const update = async (patch) => {
  emit({ saving: true, error: "" });
  try {
    const res = await settingsAPI.setOrdering(patch);
    const next = fromServer(res.data?.data);
    emit({ ...next, saving: false });
    return next;
  } catch (err) {
    emit({ saving: false, error: err.response?.data?.message || "Couldn't change online ordering. Try again." });
    return null;
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

/* Small bottom-right status toast shared by the switches */
function useNotice() {
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  return [notice, setNotice];
}

function Notice({ notice, error, hideError }) {
  if (!notice && !(error && !hideError)) return null;
  return (
    <div role="status" className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${error && !notice ? "bg-red-600" : "bg-gray-900"}`}>
      {notice || error}
    </div>
  );
}

/* Visual toggle track used by every switch */
function Track({ on, small = false }) {
  return (
    <span className={`relative inline-flex shrink-0 items-center rounded-full transition-colors ${small ? "h-5 w-9" : "h-6 w-11"} ${on ? "bg-emerald-500" : "bg-red-500"}`}>
      <span className={`inline-block rounded-full bg-white shadow transition-transform ${small ? "h-4 w-4" : "h-5 w-5"} ${
        on ? (small ? "translate-x-[18px]" : "translate-x-[22px]") : "translate-x-0.5"
      }`} />
    </span>
  );
}

/* ── Topbar: master switch ──────────────────────────────────────────────── */
export function OrderingSwitch() {
  const { open, pickup, delivery, saving, error } = useOrdering();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useNotice();

  if (open === null) return null; // not loaded yet

  const turnOn = async () => {
    const bothWereOff = !pickup && !delivery;
    if (await update({ open: true })) {
      setNotice(bothWereOff ? "Online orders are back on, with pickup and delivery." : "Online orders are back on.");
    }
  };
  const turnOff = async () => {
    if (await update({ open: false })) {
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
        <Track on={open} />
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

      <Notice notice={notice} error={error} hideError={confirming} />
    </>
  );
}

/* ── Topbar: Pickup / Delivery switches ─────────────────────────────────── */
export function MethodSwitch({ method }) {
  const s = useOrdering();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useNotice();

  if (s.open === null) return null;

  const on = s[method];
  const label = LABEL[method];
  const Icon = ICON[method];
  const lastOne = on && !s[other(method)]; // switching this off leaves nothing → ordering goes off

  const turnOn = async () => {
    const next = await update({ [method]: true });
    if (!next) return;
    setNotice(
      next.open
        ? (s.open ? `${label} is back on.` : `${label} is on, and online orders are back on.`)
        : `${label} is on. Online orders are still OFF, so turn them on to take orders.`,
    );
  };
  const turnOff = async () => {
    const next = await update({ [method]: false });
    if (!next) return;
    setConfirming(false);
    setNotice(lastOne && s.open ? `${label} is off. Pickup and delivery are both off, so online orders are now OFF.` : `${label} is now off.`);
  };

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label} orders`}
        disabled={s.saving}
        onClick={() => (on ? setConfirming(true) : turnOn())}
        title={on ? `Customers can choose ${method}. Click to stop.` : `${label} is off. Click to turn it back on.`}
        className={`flex items-center gap-2 rounded-full border pl-2.5 pr-1 py-1 text-xs font-semibold transition-colors disabled:opacity-60 ${
          on
            ? "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
            : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
        } ${s.open ? "" : "opacity-70"}`}
      >
        <Icon size={15} className="shrink-0" aria-hidden />
        <span className="hidden whitespace-nowrap sm:inline">{label} {on ? "ON" : "OFF"}</span>
        <Track on={on} small />
      </button>

      <ConfirmDialog
        isOpen={confirming}
        title={`Stop taking ${method} orders?`}
        message={
          <>
            Customers won't be able to choose {method} on the website until you turn it back on.
            Unpaid {method} checkouts are cancelled; orders that are already paid are not affected.
            {lastOne && s.open && (
              <span className="mt-2 block font-semibold text-red-700">
                {LABEL[other(method)]} is already off, so this also turns online orders OFF.
              </span>
            )}
            {s.error && <span className="mt-2 block text-red-600">{s.error}</span>}
          </>
        }
        confirmLabel={`Stop ${method}`}
        cancelLabel={`Keep ${method}`}
        variant="danger"
        loading={s.saving}
        onConfirm={turnOff}
        onCancel={() => setConfirming(false)}
      />

      <Notice notice={notice} error="" />
    </>
  );
}

/* ── Layout banner while ordering (or one method) is OFF ────────────────── */
export function OrderingOffBanner() {
  const { open, pickup, delivery, autoClosed, saving } = useOrdering();
  if (open === null) return null;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-600 px-4 py-2.5 text-white lg:px-6">
        <p className="flex items-center gap-2 text-sm font-medium">
          <PauseCircle size={18} className="shrink-0" />
          {autoClosed || (!pickup && !delivery)
            ? "Online ordering is OFF: pickup and delivery are both switched off."
            : "Online ordering is OFF: customers can't place orders on the website."}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => update({ open: true })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          <PlayCircle size={16} /> Turn on
        </button>
      </div>
    );
  }

  if (pickup && delivery) return null;
  const off = pickup ? "delivery" : "pickup";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 lg:px-6">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PauseCircle size={18} className="shrink-0 text-amber-600" />
        {LABEL[off]} is OFF: customers can only order {other(off)} on the website.
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={() => update({ [off]: true })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        <PlayCircle size={16} /> Turn {off} on
      </button>
    </div>
  );
}
