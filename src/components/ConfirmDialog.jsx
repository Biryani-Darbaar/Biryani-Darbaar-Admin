import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * ConfirmDialog — generic confirmation modal.
 *
 * Props:
 *   isOpen      boolean
 *   title       string
 *   message     string | ReactNode
 *   confirmLabel string  (default "Confirm")
 *   cancelLabel  string  (default "Cancel")
 *   variant     "danger" | "primary"  (default "danger")
 *   loading     boolean  — disables buttons while async action runs
 *   onConfirm   () => void
 *   onCancel    () => void
 */
export default function ConfirmDialog({
  isOpen,
  title       = "Are you sure?",
  message     = "This action cannot be undone.",
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  variant      = "danger",
  loading      = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  // Trap focus on open; close on Escape
  useEffect(() => {
    if (!isOpen) return;
    confirmRef.current?.focus();
    const handler = (e) => { if (e.key === "Escape") onCancel?.(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmCls =
    variant === "danger"
      ? "btn-danger"
      : "btn-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Panel */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {/* Close */}
        {!loading && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        )}

        {/* Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          variant === "danger" ? "bg-red-100" : "bg-blue-100"
        }`}>
          <AlertTriangle size={22} className={variant === "danger" ? "text-red-600" : "text-blue-600"} />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1 justify-center py-2"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`${confirmCls} flex-1 justify-center py-2`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
