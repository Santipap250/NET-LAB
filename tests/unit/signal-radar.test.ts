import { describe, expect, it } from "vitest";
import { maskIdentifier, qualityLabel, signalQuality } from "../../src/lib/signalRadar";
describe("Signal Radar pure helpers", () => {
  it("masks hardware identifiers by default", () => { expect(maskIdentifier("AA:BB:CC:DD:EE:FF")).toBe("AA:BB:CC:••:••:••"); expect(maskIdentifier("abcdef1234")).toBe("abc••••34"); });
  it("uses deterministic approximate quality bands", () => { expect(signalQuality(-50)).toBe("excellent"); expect(signalQuality(-65)).toBe("good"); expect(signalQuality(-72)).toBe("fair"); expect(signalQuality(-90)).toBe("weak"); expect(signalQuality(null)).toBe("unknown"); });
  it("localizes quality labels", () => { expect(qualityLabel("good", true)).toBe("ดี"); expect(qualityLabel("good", false)).toBe("Good"); });
});
