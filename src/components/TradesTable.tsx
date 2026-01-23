import { useMemo, useState } from "react";
import type { Trade } from "../types/models";
import { fmtMoney } from "../utils/numbers";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";

export function TradesTable({ trades }: { trades: Trade[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return trades;
    return trades.filter((t) => t.symbol.toLowerCase().includes(s));
  }, [trades, q]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Trades (Position Sessions)</CardTitle>
        <Button variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide" : "Show"}
        </Button>
      </CardHeader>

      {open ? (
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Filter ticker (e.g. TSLA)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="text-xs text-neutral-500">
              Showing {filtered.length.toLocaleString()} trades
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  {["Symbol", "Qty", "Entry", "Exit", "Entry Px", "Exit Px", "PnL", "Legs"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.slice(0, 300).map((t) => (
                  <tr key={t.id} className="border-t border-neutral-200">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{t.symbol}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.qty}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.entryDate}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.exitDate}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.entryPrice.toFixed(4)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.exitPrice.toFixed(4)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtMoney(t.pnl)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{t.legs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > 300 ? (
            <div className="mt-2 text-xs text-neutral-500">Showing first 300 rows</div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
