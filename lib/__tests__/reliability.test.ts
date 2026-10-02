import { withRetry } from "@/lib/retry";
import { rateLimit, clientIp } from "@/lib/rate-limit";

describe("withRetry", () => {
  it("returns the first success without retrying", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, 3, 1)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries then succeeds", async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error("x")).mockResolvedValue("ok");
    await expect(withRetry(fn, 3, 1)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after all attempts", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("nope"));
    await expect(withRetry(fn, 2, 1)).rejects.toThrow("nope");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("rateLimit", () => {
  afterEach(() => jest.restoreAllMocks());
  const key = () => `k-${Math.random()}`;

  it("allows up to the limit, then blocks with retryAfter", () => {
    const k = key();
    expect(rateLimit(k, 2, 1000).ok).toBe(true);
    expect(rateLimit(k, 2, 1000).ok).toBe(true);
    const blocked = rateLimit(k, 2, 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const a = key();
    rateLimit(a, 1, 1000);
    expect(rateLimit(a, 1, 1000).ok).toBe(false);
    expect(rateLimit(key(), 1, 1000).ok).toBe(true);
  });

  it("resets after the window", () => {
    const k = key();
    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now);
    rateLimit(k, 1, 1000);
    expect(rateLimit(k, 1, 1000).ok).toBe(false);
    spy.mockReturnValue(now + 1001);
    expect(rateLimit(k, 1, 1000).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to unknown", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});