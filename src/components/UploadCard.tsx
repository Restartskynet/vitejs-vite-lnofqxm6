import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

interface Props {
  fileName: string;
  onPickFile: (file: File) => void;
  metaText?: string;
}

export function UploadCard({ fileName, onPickFile, metaText }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Webull Orders CSV</CardTitle>
        <CardDescription>
          Desktop: drag/drop or click • Mobile: tap button • Local processing only
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) onPickFile(f);
            }}
          >
            <div className="text-sm font-semibold text-neutral-900">
              Drag & drop your CSV here
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              (Or use the button below)
            </div>

            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => inputRef.current?.click()}>
                Tap to Upload CSV
              </Button>

              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickFile(f);
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
            <span>
              Loaded:{" "}
              <span className="font-semibold text-neutral-900">
                {fileName || "—"}
              </span>
            </span>
            {metaText ? <span className="opacity-80">• {metaText}</span> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
