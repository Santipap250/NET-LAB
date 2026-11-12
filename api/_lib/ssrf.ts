import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export class SsrfError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const MAX_REDIRECTS = 5;
const UA = "OBIX-NET-LAB/0.1 (+diagnostics)";
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/;

/** true = blocked (non-public) */
export function isBlockedIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = p as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function expandIPv6(input: string): number[] | null {
  let s = (input.toLowerCase().split("%")[0] ?? "").trim();
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const o = m[2]!.split(".").map(Number);
    if (o.length !== 4 || o.some((n) => !(n >= 0 && n <= 255))) return null;
    s = `${m[1]}${((o[0]! << 8) | o[1]!).toString(16)}:${((o[2]! << 8) | o[3]!).toString(16)}`;
  }
  const parts = s.split("::");
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(":") : [];
  let groups: string[];
  if (parts.length === 1) {
    if (head.length !== 8) return null;
    groups = head;
  } else {
    const fill = 8 - head.length - tail.length;
    if (fill < 1) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...tail];
  }
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

/** Only global unicast 2000::/3 is allowed, minus documentation/teredo/6to4. */
export function isBlockedIPv6(ip: string): boolean {
  const g = expandIPv6(ip);
  if (!g) return true;
  const g0 = g[0]!;
  const g1 = g[1]!;
  if ((g0 & 0xe000) !== 0x2000) return true;
  if (g0 === 0x2001 && (g1 === 0x0db8 || g1 === 0)) return true;
  if (g0 === 0x2002) return true;
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) return isBlockedIPv4(ip);
  if (v === 6) return isBlockedIPv6(ip);
  return true;
}

export function validateTarget(raw: unknown): URL {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048)
    throw new SsrfError("INVALID_URL", "A URL is required (max 2048 characters).");
  if (/[\u0000-\u001f\u007f\\\s]/.test(raw))
    throw new SsrfError("INVALID_URL", "URL contains illegal characters.");
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SsrfError("INVALID_URL", "URL is malformed.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:")
    throw new SsrfError("INVALID_URL", "Only http and https are allowed.");
  if (u.username || u.password)
    throw new SsrfError("INVALID_URL", "Credentials in URL are not allowed.");
  const port = u.port === "" ? (u.protocol === "https:" ? "443" : "80") : u.port;
  if (port !== "80" && port !== "443")
    throw new SsrfError("INVALID_PORT", "Only ports 80 and 443 are allowed.");
  let host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (!host || host.includes("%")) throw new SsrfError("INVALID_URL", "Invalid hostname.");
  if (host === "localhost" || /\.(localhost|local|internal|localdomain|lan|home|corp)$/.test(host))
    throw new SsrfError("BLOCKED_TARGET", "Target is not allowed.", 403);
  if (net.isIP(host)) {
    if (isBlockedIp(host)) throw new SsrfError("BLOCKED_TARGET", "Target is not allowed.", 403);
  } else if (!DOMAIN_RE.test(host)) {
    throw new SsrfError("INVALID_URL", "Invalid hostname.");
  }
  return u;
}

export async function resolvePublic(hostname: string): Promise<{ address: string; family: 4 | 6 }> {
  const bare = hostname.replace(/^\[|\]$/g, "");
  const lit = net.isIP(bare);
  if (lit) {
    if (isBlockedIp(bare)) throw new SsrfError("BLOCKED_TARGET", "Target is not allowed.", 403);
    return { address: bare, family: lit as 4 | 6 };
  }
  let addrs: { address: string; family: number }[];
  try {
    addrs = await dns.lookup(bare, { all: true, verbatim: true });
  } catch {
    throw new SsrfError("DNS_ERROR", "Hostname could not be resolved.", 502);
  }
  if (addrs.length === 0 || addrs.some((a) => isBlockedIp(a.address)))
    throw new SsrfError("BLOCKED_TARGET", "Target resolves to a non-public address.", 403);
  const first = addrs[0]!;
  return { address: first.address, family: first.family as 4 | 6 };
}

function pinnedRequest(
  u: URL,
  pin: { address: string; family: 4 | 6 },
  method: string,
  timeoutMs: number,
): Promise<{ status: number; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const isHttps = u.protocol === "https:";
    const bare = u.hostname.replace(/^\[|\]$/g, "");
    const opts: https.RequestOptions = {
      host: pin.address, // connect to the validated IP, never re-resolve
      family: pin.family,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method,
      headers: { Host: u.host, "User-Agent": UA, Accept: "*/*", "Accept-Encoding": "identity", Connection: "close" },
      servername: isHttps && !net.isIP(bare) ? bare : undefined, // SNI + cert check against real hostname
      timeout: timeoutMs,
    };
    const request = (isHttps ? https.request : http.request) as typeof https.request;
    const req = request(opts, (res) => {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(res.headers)) {
        if (k === "set-cookie" || v === undefined) continue;
        headers[k] = Array.isArray(v) ? v.join(", ") : v;
      }
      resolve({ status: res.statusCode ?? 0, headers });
      res.destroy(); // body is never read
    });
    req.on("timeout", () => req.destroy(new SsrfError("TIMEOUT", "Target timed out.", 504)));
    req.on("error", (e) =>
      reject(e instanceof SsrfError ? e : new SsrfError("UPSTREAM_ERROR", "Could not connect to target.", 502)),
    );
    req.end();
  });
}

export interface InspectResult {
  requestedUrl: string;
  finalUrl: string;
  statusCode: number;
  responseTimeMs: number;
  responseHeaders: Record<string, string>;
  redirectChain: { url: string; statusCode: number; location?: string }[];
  timestamp: string;
}

export async function inspectUrl(rawUrl: unknown, method: "GET" | "HEAD", deadlineMs = 10_000): Promise<InspectResult> {
  const started = performance.now();
  const chain: InspectResult["redirectChain"] = [];
  let current = validateTarget(rawUrl);
  const requestedUrl = current.toString();
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const remaining = deadlineMs - (performance.now() - started);
    if (remaining <= 0) throw new SsrfError("TIMEOUT", "Target timed out.", 504);
    const pin = await resolvePublic(current.hostname);
    const r = await pinnedRequest(current, pin, method, remaining);
    const location = r.headers["location"];
    chain.push({ url: current.toString(), statusCode: r.status, ...(location ? { location } : {}) });
    if (r.status >= 300 && r.status < 400 && location) {
      if (i === MAX_REDIRECTS) break;
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new SsrfError("INVALID_REDIRECT", "Redirect target is malformed.", 502);
      }
      current = validateTarget(next.toString()); // re-validate every hop
      continue;
    }
    return {
      requestedUrl,
      finalUrl: current.toString(),
      statusCode: r.status,
      responseTimeMs: Math.round(performance.now() - started),
      responseHeaders: r.headers,
      redirectChain: chain,
      timestamp: new Date().toISOString(),
    };
  }
  throw new SsrfError("TOO_MANY_REDIRECTS", "Too many redirects.", 502);
}
