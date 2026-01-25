import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import type { ImportWarning } from "../types/models";

function badgeVariant(level: ImportWarning["level"]) {
  if (level === "error") return "destructive";
  if (level === "warning" || level === "warn") return "secondary";
  return "outline";
}

export default function WarningsCard({ warnings }: { warnings: ImportWarning[] }) {
  if (!warnings?.length) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-neutral-600">
          Upload your Webull Orders CSV to generate the dashboard.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Import / Build Warnings</div>
          <Badge variant="outline">{warnings.length}</Badge>
        </div>

        <div className="space-y-2">
          {warnings.map((w, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 rounded-xl border bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-xs text-neutral-500">
                  <Badge variant={badgeVariant(w.level)} className="mr-2">
                    {w.level.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-sm">{w.message}</div>
              </div>

              {w.action ? (
                <Badge variant="outline" className="shrink-0">
                  {w.action}
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
