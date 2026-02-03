type ReqLike = {
  headers: Record<string, string | string[] | undefined>;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (body: Record<string, unknown>) => void;
  setHeader: (name: string, value: string) => void;
};

export const setNoStore = (res: ResLike) => {
  res.setHeader('Cache-Control', 'no-store');
};

export const requireAppRequest = (req: ReqLike, res: ResLike): boolean => {
  const header = req.headers['x-app-request'];
  const value = Array.isArray(header) ? header[0] : header;
  if (value !== '1') {
    res.status(403).json({ message: 'Missing X-App-Request header.' });
    return false;
  }

  const originHeader = req.headers.origin || req.headers.referer;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const hostHeader = req.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        res.status(403).json({ message: 'Origin check failed.' });
        return false;
      }
    } catch {
      res.status(403).json({ message: 'Origin check failed.' });
      return false;
    }
  }

  return true;
};
