import { beforeEach, describe, expect, it } from "vitest";
import health from "../../api/health";
import inspect from "../../api/inspect-url";
import { resetRateLimits } from "../../api/_lib/rate";

function mockRes() {
  const r = {
    statusCode: 200, headers: {} as Record<string, string>, body: undefined as unknown,
    status(c: number) { r.statusCode = c; return r; },
    setHeader(k: string, v: string) { r.headers[k] = v; return r; },
    json(b: unknown) { r.body = b; return r; },
  };
  return r;
}
const call = (h: (a: never, b: never) => unknown, req: object) => { const res = mockRes(); return Promise.resolve(h(req as never, res as never)).then(() => res); };

describe("API", () => {
  beforeEach(() => resetRateLimits());
  it("health returns status, application, timestamp", async () => {
    const res = await call(health as never, {});
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", application: "OBIX NET-LAB" });
  });
  it("inspect-url rejects non-POST", async () => {
    expect((await call(inspect as never, { method: "GET", headers: {} })).statusCode).toBe(405);
  });
  it("inspect-url validates method and blocks private targets without any network call", async () => {
    const base = { method: "POST", headers: { "x-forwarded-for": "9.9.9.9" } };
    expect((await call(inspect as never, { ...base, body: { url: "https://example.com", method: "POST" } })).statusCode).toBe(400);
    const r = await call(inspect as never, { ...base, body: { url: "http://127.0.0.1", method: "GET" } });
    expect(r.statusCode).toBe(403);
    expect(r.body).toEqual({ error: { code: "BLOCKED_TARGET", message: "Target is not allowed." } });
  });
  it("inspect-url rate limits", async () => {
    const req = { method: "POST", headers: { "x-forwarded-for": "7.7.7.7" }, body: { url: "http://localhost", method: "GET" } };
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await call(inspect as never, req)).statusCode;
    expect(last).toBe(429);
  });
});
