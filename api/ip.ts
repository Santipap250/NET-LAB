import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clientIp } from "./_lib/rate.js";

const err = (res: VercelResponse, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "private, max-age=300");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return err(res, 405, "METHOD_NOT_ALLOWED", "Use GET.");
  }
  const ip = clientIp(req.headers);
  if (ip === "unknown" || ip === "::1" || ip.startsWith("127."))
    return err(res, 404, "NO_PUBLIC_IP", "Could not determine a public client IP.");
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as {
      success?: boolean;
      ip?: string;
      type?: string;
      country?: string;
      region?: string;
      city?: string;
      connection?: { asn?: number; isp?: string; org?: string };
    };
    if (!j.success || !j.ip) return err(res, 502, "UPSTREAM_ERROR", "IP metadata provider returned no data.");
    return res.status(200).json({
      ip: j.ip,
      ipVersion: j.type === "IPv6" ? 6 : 4,
      provider: j.connection?.isp ?? j.connection?.org ?? null,
      country: j.country ?? null,
      region: j.region ?? null,
      city: j.city ?? null,
      asn: j.connection?.asn ?? null,
      source: "ipwho.is",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return err(res, 502, "UPSTREAM_ERROR", "IP metadata provider is unavailable.");
  }
}
