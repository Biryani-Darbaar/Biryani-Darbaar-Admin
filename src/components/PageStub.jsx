import { CheckCircle2 } from "lucide-react";

/**
 * PageStub — placeholder for pages that will be implemented in a future phase.
 * Shows the planned feature list so the architecture is clear before coding begins.
 */
export default function PageStub({
  icon: Icon,
  title,
  description,
  phase,
  badge,
  features = [],
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon size={22} className="text-primary-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 animate-pulse">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Phase banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">⚡</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">Coming in {phase}</p>
          <p className="text-xs text-amber-700">
            Architecture and API endpoints are ready. UI implementation starts next.
          </p>
        </div>
      </div>

      {/* Planned features */}
      {features.length > 0 && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="font-semibold text-gray-900 text-sm">Planned Features</h3>
          </div>
          <div className="admin-card-body">
            <ul className="space-y-2.5">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* API ready notice */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-xs font-bold">✓</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-green-900">Backend API Ready</p>
          <p className="text-sm text-green-700 mt-0.5">
            All backend routes for this section are implemented, authenticated, and ready to consume.
          </p>
        </div>
      </div>
    </div>
  );
}
