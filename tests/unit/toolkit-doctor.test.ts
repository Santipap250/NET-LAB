import { describe, expect, it } from "vitest";
import { formatJson, ipv4ToBinary, isDomain, subnet } from "../../src/lib/toolkit";
import { doctor } from "../../src/lib/doctor";
describe("network toolkit", () => {
  it("calculates IPv4 CIDR details", () => { const r = subnet("192.168.1.10", "24"); expect(r?.network).toBe("192.168.1.0"); expect(r?.broadcast).toBe("192.168.1.255"); expect(r?.hosts).toBe(254); });
  it("rejects invalid addresses and domains", () => { expect(subnet("999.1.1.1", "24")).toBeNull(); expect(isDomain("bad domain")).toBe(false); expect(isDomain("example.com")).toBe(true); });
  it("formats JSON without inventing values", () => { expect(formatJson('{"a":1}')).toEqual({ ok: true, value: '{\n  "a": 1\n}' }); expect(formatJson("nope").ok).toBe(false); });
  it("converts IPv4 to binary", () => expect(ipv4ToBinary("192.168.1.1")).toBe("11000000.10101000.00000001.00000001"));
});
describe("connection doctor", () => { it("returns actionable offline guidance", () => { const r = doctor("wifi", "offline", "POCO X6 Pro"); expect(r.causes.length).toBeGreaterThan(0); expect(r.steps.join(" ")).toContain("browser cannot change network settings"); }); });
