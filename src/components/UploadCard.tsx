import { useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

export function UploadCard(props: {
  onFile: (file: File) => void;
  status: "idle" | "loading" | "ready" | "error";
  startingEquity: string;
  setStartingEquity: (next: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const canUpload = props.status !== "loading";

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>1) Upload Webull Orders CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-800">Starting equity</label>
          <Input
            value={props.startingEquity}
            onChange={(e) => props.setStartingEquity(e.target.value)}
            inputMode="decimal"
            placeholder="25000"
          />
          <div className="text-xs text-slate-500">
            This is your equity before the first trade in the imported CSV.
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            props.onFile(file);
            // reset the input so uploading the same file again retriggers change
            e.currentTarget.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={!canUpload}
            onClick={() => fileRef.current?.click()}
          >
            {props.status === "loading" ? "Importing…" : "Choose CSV"}
          </Button>

          <div className="text-xs text-slate-500">
            Supported (v1): Webull → <span className="font-medium">Orders Records</span> CSV
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
