import { describe, expect, it } from "vitest";
import { computeStats } from "../../src/lib/stats";
import { toCsv } from "../../src/lib/export";
import { parseDoh } from "../../src/lib/dns";

describe("stats", () => {
  it("computes min/max/avg/median/jitter", () => {
    const s = computeStats([10, 20, 40])!;
    expect(s.min).toBe(10); expect(s.max).toBe(40); expect(s.median).toBe(20);
    expect(s.avg).toBeCloseTo(23.333, 2); expect(s.jitter).toBe(15);
  });
  it("returns null for empty input", () => expect(computeStats([])).toBeNull());
});
describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(toCsv([{ a: "x,y", b: 'q"t' }])).toBe('a,b\n"x,y","q""t"');
  });
});
describe("dns parsing", () => {
  it("parses answers and never invents records", () => {
    const r = parseDoh({ Status: 0, Answer: [{ name: "example.com.", type: 1, TTL: 300, data: "93.184.216.34" }] });
    expect(r.records).toEqual([{ name: "example.com.", type: "A", ttl: 300, data: "93.184.216.34" }]);
    expect(parseDoh({ Status: 3 }).records).toEqual([]);
  });
  it("rejects malformed responses", () => expect(() => parseDoh({})).toThrow());
});
