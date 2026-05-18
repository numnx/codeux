import { vi } from 'vitest';
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = vi.fn().mockImplementation((cb) => setTimeout(cb, 0));
  window.cancelAnimationFrame = vi.fn().mockImplementation((id) => clearTimeout(id));
}
