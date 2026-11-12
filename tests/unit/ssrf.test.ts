import { describe, expect, it } from "vitest";
import { isBlockedIp, SsrfError, validateTarget } from "../../api/_lib/ssrf";
import { rateLimit, resetRateLimits } from "../../api/_lib/rate";

describe("IP blocking", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1"])(
    "blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true));
  it.each(["::1", "::", "fe80::1", "fc00::1", "fd12:3456::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "2001:db8::1", "64:ff9b::1"])(
    "blocks IPv6 %s", (ip) => expect(isBlockedIp(ip)).toBe(true));
  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111", "2001:4860:4860::8888"])(
    "allows public %s", (ip) => expect(isBlockedIp(ip)).toBe(false));
});

describe("validateTarget", () => {
  const code = (u: unknown) => { try { validateTarget(u); return "OK"; } catch (e) { return (e as SsrfError).code; } };
  it("accepts public http/https URLs", () => {
    expect(code("https://example.com/path?q=1")).toBe("OK");
    expect(code("http://8.8.8.8/")).toBe("OK");
  });
  it("rejects bad schemes, ports and credentials", () => {
    expect(code("ftp://example.com")).toBe("INVALID_URL");
    expect(code("file:///etc/passwd")).toBe("INVALID_URL");
    expect(code("https://example.com:8080")).toBe("INVALID_PORT");
    expect(code("http://user:pw@example.com")).toBe("INVALID_URL");
  });
  it("rejects localhost and internal names", () => {
    expect(code("http://localhost")).toBe("BLOCKED_TARGET");
    expect(code("http://foo.localhost")).toBe("BLOCKED_TARGET");
    expect(code("http://metadata.google.internal")).toBe("BLOCKED_TARGET");
  });
  it("rejects encoded/alternative IP forms", () => {
    expect(code("http://2130706433/")).toBe("BLOCKED_TARGET");
    expect(code("http://0x7f.0.0.1/")).toBe("BLOCKED_TARGET");
    expect(code("http://127.1/")).toBe("BLOCKED_TARGET");
    expect(code("http://[::1]/")).toBe("BLOCKED_TARGET");
    expect(code("http://[::ffff:7f00:1]/")).toBe("BLOCKED_TARGET");
    expect(code("http://169.254.169.254/latest/meta-data")).toBe("BLOCKED_TARGET");
  });
  it("rejects malformed input", () => {
    expect(code("")).toBe("INVALID_URL");
    expect(code(42)).toBe("INVALID_URL");
    expect(code("http://exa mple.com")).toBe("INVALID_URL");
    expect(code("http://example.com\\@evil.com")).toBe("INVALID_URL");
  });
});

describe("rate limiting", () => {
  it("blocks after the limit and resets after the window", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, 0).allowed).toBe(true);
    expect(rateLimit("k", 3, 1000, 10).allowed).toBe(false);
    expect(rateLimit("k", 3, 1000, 2000).allowed).toBe(true);
  });
});
