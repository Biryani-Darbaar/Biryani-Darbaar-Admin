/**
 * StatusBadge — colour-coded pill for order statuses.
 * Used on Dashboard, Orders, and LiveOrders pages.
 */

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  preparing: {
    label: "Preparing",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  packed: {
    label: "Packed",
    className: "bg-orange-50 text-orange-700 border-orange-200",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-600 border-red-200",
  },
  shipped: {
    label: "Shipped",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export default function StatusBadge({ status, className = "" }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status ?? "Unknown",
    className: "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <span
      className={`badge border font-medium capitalize ${cfg.className} ${className}`}
    >
      {cfg.label}
    </span>
  );
}

/** Exported for use in charts / colour-mapped legend */
export const STATUS_COLORS = {
  pending:          "#94a3b8",
  confirmed:        "#3b82f6",
  preparing:        "#f59e0b",
  packed:           "#f97316",
  out_for_delivery: "#8b5cf6",
  delivered:        "#22c55e",
  cancelled:        "#ef4444",
  shipped:          "#8b5cf6",
};

export const STATUS_LABELS = {
  pending:          "Pending",
  confirmed:        "Confirmed",
  preparing:        "Preparing",
  packed:           "Packed",
  out_for_delivery: "Out for Delivery",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
  shipped:          "Shipped",
};
