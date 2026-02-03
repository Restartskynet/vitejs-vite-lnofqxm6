export default function handler(_req: unknown, res: {
  status: (code: number) => { json: (body: { ok: boolean }) => void };
  setHeader: (name: string, value: string) => void;
}) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
}
