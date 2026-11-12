import { describe, expect, it } from "vitest";
import { isDomain, isIPv4, isIPv6, normalizeUrl } from "../../src/lib/validate";

describe("validation", () => {
  it("validates IPv4", () => {
    expect(isIPv4("8.8.8.8")).toBe(true);
    expect(isIPv4("256.1.1.1")).toBe(false);
    expect(isIPv4("1.2.3")).toBe(false);
  });
  it("validates IPv6", () => {
    expect(isIPv6("2001:4860:4860::8888")).toBe(true);
    expect(isIPv6("::1")).toBe(true);
    expect(isIPv6("not-an-ip")).toBe(false);
  });
  it("validates domains", () => {
    expect(isDomain("example.com")).toBe(true);
    expect(isDomain("sub.example.co.uk")).toBe(true);
    expect(isDomain("-bad.com")).toBe(false);
    expect(isDomain("nodot")).toBe(false);
  });
  it("normalizes URLs", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com/");
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
});
