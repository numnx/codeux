function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function structuralClone<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(structuralClone) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    result[key] = structuralClone((value as Record<string, unknown>)[key]);
  }
  return result as T;
}

export function structuralEquality(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") {
    return false; // a === b already checked
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!structuralEquality(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (Array.isArray(b)) {
    return false;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !structuralEquality((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

export function structuralMerge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return (patch === undefined ? base : patch) as T;
  }

  const baseRecord = toRecord(base);
  const patchRecord = toRecord(patch);
  const result: Record<string, unknown> = { ...baseRecord };

  for (const [key, value] of Object.entries(patchRecord)) {
    const current = result[key];
    if (Array.isArray(value)) {
      result[key] = structuralClone(value);
      continue;
    }
    if (value && typeof value === "object") {
      result[key] = structuralMerge(current ?? {}, value);
      continue;
    }
    result[key] = value;
  }

  return result as T;
}

export function structuralDiff(base: unknown, value: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(value)) {
    return structuralEquality(base, value) ? undefined : value;
  }

  if (!base || typeof base !== "object" || !value || typeof value !== "object") {
    return structuralEquality(base, value) ? undefined : value;
  }

  const baseRecord = toRecord(base);
  const valueRecord = toRecord(value);
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(valueRecord)) {
    const nextDiff = structuralDiff(baseRecord[key], valueRecord[key]);
    if (nextDiff !== undefined) {
      result[key] = nextDiff;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
