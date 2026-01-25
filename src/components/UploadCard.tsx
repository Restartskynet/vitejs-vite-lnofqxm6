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

  return (
    <Card>
      <CardHeader>
        <CardTitle>1) Import Webull CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Starting equity</div>
          <Input
            inputMode="decimal"
            value={props.startingEquity}
            onChange={(e) => props.setStartingEquity(e.target.value)}
            placeholder="20000"
          />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) props.onFile(f);
            e.currentTarget.value = "";
          }}
        />

        <Button
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={props.status === "loading"}
        >
          {props.status === "loading" ? "Importing..." : "Choose CSV"}
        </Button>

        <div className="text-xs text-muted-foreground">
          Supported: Webull <b>Orders Records</b> CSV (v1). “Partially Filled” rows are ignored with a warning.
        </div>
      </CardContent>
    </Card>
  );
}
