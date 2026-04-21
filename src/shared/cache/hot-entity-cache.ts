/**
 * A simple bounded FIFO cache for frequently accessed entities.
 */
export class HotCache<K, V> {
  private cache = new Map<K, V>();
  private keys: K[] = [];

  constructor(private readonly maxSize: number = 500) {}

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      return;
    }

    if (this.keys.length >= this.maxSize) {
      const oldestKey = this.keys.shift();
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, value);
    this.keys.push(key);
  }

  delete(key: K): void {
    if (this.cache.delete(key)) {
      this.keys = this.keys.filter((k) => k !== key);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.keys = [];
  }
}
