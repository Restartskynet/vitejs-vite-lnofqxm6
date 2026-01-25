import { useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export function UploadCard(props: {
  onFile: (file: File) => void;
  status: "idle" | "loading" | "ready" | "error";
  startingEquity: string;
  setStartingEquity: (next: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const canUpload = props.status !== "loading";

  const statusConfig = {
    idle: { icon: Upload, text: 'Choose CSV', color: 'text-slate-400' },
    loading: { icon: Loader2, text: 'Importing…', color: 'text-blue-400 animate-spin' },
    ready: { icon: CheckCircle2, text: 'Data loaded', color: 'text-emerald-400' },
    error: { icon: XCircle, text: 'Upload failed', color: 'text-rose-400' }
  };

  const StatusIcon = statusConfig[props.status].icon;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
      <div className="p-6 pb-4 border-b border-slate-700/50">
        <h3 className="text-lg font-semibold text-white">Upload Webull Orders CSV</h3>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">Starting equity</label>
          <input
            value={props.startingEquity}
            onChange={(e) => props.setStartingEquity(e.target.value)}
            inputMode="decimal"
            placeholder="25000"
            className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/50 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-600/50 transition-all"
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
            e.currentTarget.value = "";
          }}
        />

        <div className="flex flex-col gap-3">
          <button
            disabled={!canUpload}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StatusIcon className={`w-4 h-4 ${statusConfig[props.status].color}`} />
            {statusConfig[props.status].text}
          </button>

          <div className="text-xs text-slate-500 text-center">
            Supported (v1): Webull → <span className="font-medium text-slate-400">Orders Records</span> CSV
          </div>
        </div>
      </div>
    </div>
  );
}