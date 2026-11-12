import type { VercelRequest, VercelResponse } from "@vercel/node";
import { inspectUrl, SsrfError } from "./_lib/ssrf.js";
import { clientIp, rateLimit } from "./_lib/rate.js";

const err = (res: VercelResponse, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return err(res, 405, "METHOD_NOT_ALLOWED", "Use POST.");
  }
  const limit = Number(process.env.INSPECT_RATE_LIMIT) || 10;
  const rl = rateLimit(clientIp(req.headers), limit);
  if (!rl.allowed) {
    res.setHeader("Retry-After", String(rl.retryAfterSec));
    return err(res, 429, "RATE_LIMITED", "Too many requests. Try again later.");
  }
  let body: unknown = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return err(res, 400, "INVALID_BODY", "Body must be valid JSON.");
    }
  }
  const { url, method } = (body ?? {}) as { url?: unknown; method?: unknown };
  if (method !== "GET" && method !== "HEAD") return err(res, 400, "INVALID_METHOD", "method must be GET or HEAD.");
  try {
    return res.status(200).json(await inspectUrl(url, method));
  } catch (e) {
    if (e instanceof SsrfError) return err(res, e.status, e.code, e.message);
    return err(res, 500, "INTERNAL_ERROR", "Unexpected error.");
  }
}
