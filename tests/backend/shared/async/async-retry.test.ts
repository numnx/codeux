import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTimeout, retryAsync, TimeoutError } from "../../../../src/shared/async/async-retry.js";

describe("async-retry utilities", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("withTimeout", () => {
    it("resolves if the promise resolves before the timeout", async () => {
      const promise = new Promise<string>(resolve => setTimeout(() => resolve("success"), 50));
      const p = withTimeout(promise, 100);
      vi.advanceTimersByTime(50);
      await expect(p).resolves.toBe("success");
    });

    it("throws TimeoutError if the promise does not resolve before the timeout", async () => {
      const promise = new Promise<string>(resolve => setTimeout(() => resolve("success"), 150));
      const p = withTimeout(promise, 100);

      const pExpect = expect(p).rejects.toThrow(TimeoutError);
      await vi.advanceTimersByTimeAsync(100);
      await pExpect;
    });

    it("aborts via AbortController if supported by the task", async () => {
      let aborted = false;
      const promiseFn = (signal: AbortSignal) => new Promise<string>((resolve, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(signal.reason);
        });
        setTimeout(() => resolve("success"), 150);
      });

      const p = withTimeout(promiseFn, 100);
      const pExpect = expect(p).rejects.toThrow(TimeoutError);
      await vi.advanceTimersByTimeAsync(100);
      await pExpect;
      expect(aborted).toBe(true);
    });

    it("rejects if parent signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort(new Error("already aborted"));

      const promise = new Promise<string>(resolve => setTimeout(() => resolve("success"), 150));
      await expect(withTimeout(promise, 100, { signal: controller.signal })).rejects.toThrow("already aborted");
    });

    it("aborts if parent signal is aborted during execution", async () => {
      const controller = new AbortController();

      const promise = new Promise<string>(resolve => setTimeout(() => resolve("success"), 150));
      const p = withTimeout(promise, 100, { signal: controller.signal });

      const pExpect = expect(p).rejects.toThrow("aborted mid-flight");
      controller.abort(new Error("aborted mid-flight"));
      await vi.advanceTimersByTimeAsync(10);
      await pExpect;
    });
  });

  describe("retryAsync", () => {
    it("resolves immediately if the function succeeds on the first attempt", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        return "success";
      };
      await expect(retryAsync(fn, { attempts: 3, delayMs: 10 })).resolves.toBe("success");
      expect(calls).toBe(1);
    });

    it("retries and resolves if the function succeeds on a subsequent attempt", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        if (calls < 3) throw new Error("fail");
        return "success";
      };

      const p = retryAsync(fn, { attempts: 3, delayMs: 10 });
      const pExpect = expect(p).resolves.toBe("success");
      await vi.advanceTimersByTimeAsync(10);
      await vi.advanceTimersByTimeAsync(10);
      await pExpect;
      expect(calls).toBe(3);
    });

    it("throws the last error if max attempts are exhausted", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        throw new Error("always fail");
      };

      const p = retryAsync(fn, { attempts: 3, delayMs: 10 });
      const pExpect = expect(p).rejects.toThrow("always fail");
      await vi.advanceTimersByTimeAsync(10);
      await vi.advanceTimersByTimeAsync(10);
      await pExpect;
      expect(calls).toBe(3);
    });

    it("does not retry if isRetryable returns false", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        throw new Error("fatal");
      };
      const isRetryable = (e: any) => e.message !== "fatal";

      await expect(retryAsync(fn, { attempts: 3, delayMs: 10, isRetryable })).rejects.toThrow("fatal");
      expect(calls).toBe(1);
    });

    it("respects exponential backoff", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        throw new Error("fail");
      };
      const p = retryAsync(fn, { attempts: 3, delayMs: 10, backoff: "exponential" });
      const pExpect = expect(p).rejects.toThrow("fail");
      await vi.advanceTimersByTimeAsync(10); // attempt 1 delay
      await vi.advanceTimersByTimeAsync(20); // attempt 2 delay
      await pExpect;
      expect(calls).toBe(3);
    });

    it("respects custom backoff function", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        throw new Error("custom fail");
      };
      const p = retryAsync(fn, {
        attempts: 3,
        backoff: (attempt) => attempt * 20
      });
      const pExpect = expect(p).rejects.toThrow("custom fail");
      await vi.advanceTimersByTimeAsync(20); // attempt 1: 1 * 20 = 20
      await vi.advanceTimersByTimeAsync(40); // attempt 2: 2 * 20 = 40
      await pExpect;
      expect(calls).toBe(3);
    });

    it("does not retry on AbortError (TimeoutError)", async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        throw new TimeoutError("Timeout");
      };
      const isRetryable = (e: any) => !(e instanceof TimeoutError);

      await expect(retryAsync(fn, { attempts: 3, delayMs: 10, isRetryable })).rejects.toThrow(TimeoutError);
      expect(calls).toBe(1);
    });
  });
});
