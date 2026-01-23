import type { ImportWarning } from "../types/models";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

function boxClass(level: ImportWarning["level"]): string {
  if (level === "error") return "border-red-200 bg-red-50";
  if (level === "warning") return "border-amber-200 bg-amber-50";
  return "border-neutral-200 bg-neutral-50";
}

function titleClass(level: ImportWarning["level"]): string {
  if (level === "error") return "text-red-900";
  if (level === "warning") return "text-amber-900";
  return "text-neutral-800";
}

export function WarningsCard({ warnings }: { warnings: ImportWarning[] }) {
  if (!warnings.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Notes</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {warnings.slice(0, 12).map((w, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 ${boxClass(w.level)}`}
          >
            <div className={`text-xs font-semibold ${titleClass(w.level)}`}>
              {w.level.toUpperCase()}: {w.message}
            </div>
            {w.action ? (
              <div className="mt-1 text-xs text-neutral-700">{w.action}</div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
