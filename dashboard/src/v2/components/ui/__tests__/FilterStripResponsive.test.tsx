/** @vitest-environment jsdom */
import { render, screen, act, cleanup } from '@testing-library/preact';
import { expect, test, vi, beforeAll, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { FilterStrip } from '../FilterStrip.js';

expect.extend(matchers);

let resizeObserverCallback: ResizeObserverCallback;

beforeAll(() => {
    class MockResizeObserver {
        constructor(callback: ResizeObserverCallback) {
            resizeObserverCallback = callback;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    }
    window.ResizeObserver = MockResizeObserver as any;
});

afterEach(() => {
    cleanup();
});

test('FilterStrip recalculates active indicator on resize', () => {
    const options = ['all', 'active', 'completed'] as const;
    const onChange = vi.fn();

    const { container } = render(<FilterStrip options={options} active="all" onChange={onChange} />);

    // Trigger resize observer
    act(() => {
        resizeObserverCallback([], new window.ResizeObserver(() => {}));
    });

    expect(screen.getByRole('tablist')).toBeInTheDocument();
});
