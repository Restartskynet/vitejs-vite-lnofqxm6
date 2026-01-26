import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { ImportWarning } from "../types/models";

export function WarningsCard({ warnings }: { warnings: ImportWarning[] }) {
  if (!warnings?.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <p className="text-sm text-slate-300">
            Upload your Webull Orders CSV to generate the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-base font-semibold text-white">Import / Build Warnings</div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
          {warnings.length}
        </span>
      </div>

      <div className="space-y-3">
        {warnings.map((w, idx) => {
          const Icon = w.level === "error" ? XCircle : w.level === "warning" || w.level === "warn" ? AlertTriangle : Info;
          const iconColor = w.level === "error" ? "text-rose-400" : w.level === "warning" || w.level === "warn" ? "text-amber-400" : "text-blue-400";
          const bgColor = w.level === "error" ? "bg-rose-500/10 border-rose-500/30" : w.level === "warning" || w.level === "warn" ? "bg-amber-500/10 border-amber-500/30" : "bg-blue-500/10 border-blue-500/30";
          
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 rounded-lg border ${bgColor} p-3`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{w.message}</div>
                {w.action && (
                  <div className="text-xs text-slate-400 mt-1">→ {w.action}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}