export function isDatabaseUnavailableError(err: unknown): boolean {
  const seen = new Set<unknown>();

  function walk(value: unknown): boolean {
    if (!value || typeof value !== "object" || seen.has(value)) return false;
    seen.add(value);

    const candidate = value as {
      code?: unknown;
      errno?: unknown;
      syscall?: unknown;
      message?: unknown;
      errors?: unknown[];
      cause?: unknown;
    };

    const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
    const errno = typeof candidate.errno === "number" ? candidate.errno : null;
    const syscall = typeof candidate.syscall === "string" ? candidate.syscall.toLowerCase() : "";
    const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

    if (
      code === "EACCES" ||
      code === "ECONNREFUSED" ||
      code === "ENETUNREACH" ||
      code === "ETIMEDOUT" ||
      code === "EHOSTUNREACH" ||
      code === "ECONNRESET" ||
      errno === -4092 ||
      syscall === "connect" ||
      message.includes("connect eacces") ||
      message.includes("connection terminated") ||
      message.includes("no pg_hba.conf entry") ||
      message.includes("timeout") ||
      message.includes("could not connect to server") ||
      message.includes("database is unavailable") ||
      message.includes("neon")
    ) {
      return true;
    }

    if (Array.isArray(candidate.errors) && candidate.errors.some((nested) => walk(nested))) {
      return true;
    }

    if (candidate.cause && walk(candidate.cause)) {
      return true;
    }

    return false;
  }

  return walk(err);
}
