import { describe, expect, it } from "vitest";
import { parseTraceroute } from "../../src/lib/traceroute";

describe("traceroute parser", () => {
  it("parses unix output with timeouts", () => {
    const h = parseTraceroute(`traceroute to example.com (93.184.216.34), 30 hops max
 1  router.lan (192.168.1.1)  1.2 ms  1.1 ms  1.0 ms
 2  * * *
 3  93.184.216.34  10.5 ms  10.1 ms  10.9 ms`);
    expect(h).toHaveLength(3);
    expect(h[0]).toMatchObject({ hop: 1, host: "router.lan", ip: "192.168.1.1" });
    expect(h[0]!.timesMs).toEqual([1.2, 1.1, 1.0]);
    expect(h[1]).toMatchObject({ hop: 2, ip: null, timeouts: 3, avgMs: null });
    expect(h[2]!.ip).toBe("93.184.216.34");
  });
  it("parses windows tracert output", () => {
    const h = parseTraceroute("  1    <1 ms    <1 ms    <1 ms  192.168.1.1");
    expect(h[0]).toMatchObject({ hop: 1, ip: "192.168.1.1", timesMs: [1, 1, 1] });
  });
  it("ignores garbage", () => expect(parseTraceroute("hello world")).toEqual([]));
});
