import { useState, useEffect, useRef } from "react";
import {
  X, Package, User, CreditCard, MapPin,
  Calendar, Hash, CheckCircle2, Loader2,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import { ordersAPI } from "../services/api";

const AUD = new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD", maximumFractionDigits: 2,
});

// Valid statuses in order
const ALL_STATUSES = [
  { value: "pending",          label: "Pending" },
  { value: "confirmed",        label: "Confirmed" },
  { value: "preparing",        label: "Preparing" },
  { value: "packed",           label: "Packed" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered",        label: "Delivered" },
  { value: "cancelled",        label: "Cancelled" },
];

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-gray-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-semibold break-all">{value}</p>
      </div>
    </div>
  );
}

/**
 * OrderDetailModal
 *
 * Props:
 *   order        — the full order object (or null to close)
 *   onClose      — () => void
 *   onStatusChange — (id, newStatus) => void  (update parent state)
 */
export default function OrderDetailModal({ order, onClose, onStatusChange }) {
  const [updating,   setUpdating]   = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [localStatus, setLocalStatus] = useState(order?.orderStatus ?? "");
  const panelRef = useRef(null);

  // Sync local status when order prop changes
  useEffect(() => {
    setLocalStatus(order?.orderStatus ?? "");
    setUpdateError("");
  }, [order?.orderStatus]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!order) return null;

  // Normalise field names client-side as a belt-and-suspenders fallback for
  // any orders in Firestore that were written before the backend normalisation.
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.orderItems)
    ? order.orderItems
    : [];

  const deliveryAddress = order.deliveryAddress ?? order.address ?? null;
  const subTotal = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0);
  const deliveryFee = (order.totalPrice ?? 0) - subTotal;

  // Date: backend now sends ISO strings; also handle numeric timestamps defensively.
  const formattedDate = (() => {
    const raw = order.orderDate;
    if (!raw) return "—";
    const d = raw instanceof Date ? raw : new Date(raw);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-AU", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  })();

  const handleStatusUpdate = async (newStatus) => {
    if (newStatus === localStatus || updating) return;
    setUpdating(true);
    setUpdateError("");
    try {
      await ordersAPI.updateStatus(order.id, newStatus, order.userId);
      setLocalStatus(newStatus);
      onStatusChange?.(order.id, newStatus);
    } catch (err) {
      setUpdateError(err.message || "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
              <Package size={17} className="text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Order ID</p>
              <p className="text-sm font-mono font-bold text-gray-900">
                #{order.id?.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={localStatus} />
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Order info grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <InfoRow icon={Hash}      label="Full Order ID"      value={order.id} />
            <InfoRow icon={User}      label="User ID"            value={order.userId} />
            <InfoRow icon={Calendar}  label="Order Date"         value={formattedDate} />
            <InfoRow icon={CreditCard} label="Payment"
              value={order.paymentVerified ? "✓ Verified" : "Pending"}
            />
            {deliveryAddress && (
              <div className="col-span-2">
                <InfoRow icon={MapPin} label="Delivery Address" value={deliveryAddress} />
              </div>
            )}
            {order.paymentIntentId && (
              <div className="col-span-2">
                <InfoRow icon={CreditCard} label="Payment Intent" value={order.paymentIntentId} />
              </div>
            )}
          </div>

          {/* ── Items ───────────────────────────────────────────────── */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Package size={14} />
              Items ({items.length})
            </h4>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No item details available</p>
            ) : (
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Item</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, i) => (
                      <tr key={item.dishId ?? i}>
                        <td className="px-4 py-2.5 font-medium text-gray-800">
                          {item.name || item.dishName || "—"}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity ?? 1}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">
                          {AUD.format(item.price ?? 0)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                          {AUD.format((item.price ?? 0) * (item.quantity ?? 1))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="border-t border-gray-200 px-4 py-3 space-y-1.5 bg-white rounded-b-xl">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span>{AUD.format(subTotal)}</span>
                  </div>
                  {deliveryFee !== 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Delivery fee</span>
                      <span>{AUD.format(deliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-primary-600">{AUD.format(order.totalPrice ?? 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Status Update ────────────────────────────────────────── */}
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-3">Update Status</h4>

            {updateError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {updateError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {ALL_STATUSES.map(({ value, label }) => {
                const isActive  = value === localStatus;
                const isCancelled = value === "cancelled";
                return (
                  <button
                    key={value}
                    onClick={() => handleStatusUpdate(value)}
                    disabled={updating || isActive}
                    className={[
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all",
                      isActive
                        ? "bg-primary-600 text-white border-primary-600 cursor-default"
                        : isCancelled
                          ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
                      updating && !isActive ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {updating && !isActive ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : isActive ? (
                      <CheckCircle2 size={13} />
                    ) : null}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
