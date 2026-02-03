import { setNoStore } from '../../_lib/security';

export default function handler(
  req: { method?: string },
  res: { status: (code: number) => { json: (body: Record<string, unknown>) => void }; setHeader: (name: string, value: string) => void }
) {
  setNoStore(res);
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed.' });
    return;
  }
  res.status(501).json({
    message: 'Passkey sign-in requires the Stytch WebAuthn flow, which must be configured on the backend.',
  });
}
