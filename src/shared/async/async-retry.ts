export class TimeoutError extends Error {
  constructor(message: string = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export interface RetryOptions {
  attempts: number;
  backoff?: "fixed" | "exponential" | ((attempt: number, error: unknown) => number);
  delayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  signal?: AbortSignal;
}

export async function withTimeout<T>(
  promise: Promise<T> | ((signal: AbortSignal) => Promise<T>),
  ms: number,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const controller = new AbortController();
  const parentSignal = options?.signal;

  if (parentSignal?.aborted) {
    throw parentSignal.reason;
  }

  const abortParent = () => controller.abort(parentSignal?.reason);
  parentSignal?.addEventListener("abort", abortParent);

  const timeoutId = setTimeout(() => {
    controller.abort(new TimeoutError(`Operation timed out after ${ms}ms`));
  }, ms);

  try {
    const task = typeof promise === "function" ? promise(controller.signal) : promise;

    // We catch the task to prevent UnhandledPromiseRejection if it fails AFTER the timeout
    const safeTask = task.catch((err) => {
      if (controller.signal.aborted) {
        // If it was aborted, we ignore the task's failure, as we already handled the abort
        return new Promise<never>(() => {});
      }
      throw err;
    });

    return await Promise.race([
      safeTask,
      new Promise<never>((_, reject) => {
        if (controller.signal.aborted) {
          reject(controller.signal.reason);
        }
        controller.signal.addEventListener("abort", () => reject(controller.signal.reason));
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
    parentSignal?.removeEventListener("abort", abortParent);
  }
}

export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let attempt = 0;
  const backoffType = options.backoff ?? "fixed";
  const maxAttempts = options.attempts;
  const isRetryable = options.isRetryable ?? (() => true);

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }

      let currentDelay: number;
      if (typeof backoffType === "function") {
        currentDelay = backoffType(attempt, error);
      } else {
        const baseDelay = options.delayMs ?? 1000;
        currentDelay = backoffType === "exponential"
          ? baseDelay * Math.pow(2, attempt - 1)
          : baseDelay;
      }

      if (options.signal?.aborted) {
        throw options.signal.reason;
      }

      await new Promise<void>((resolve, reject) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        const onAbort = () => {
          clearTimeout(timeoutId);
          reject(options.signal?.reason);
        };
        if (options.signal) {
          options.signal.addEventListener("abort", onAbort, { once: true });
        }
        timeoutId = setTimeout(() => {
          options.signal?.removeEventListener("abort", onAbort);
          resolve();
        }, currentDelay);
      });
    }
  }

  throw new Error("Unreachable");
}
