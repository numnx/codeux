// @vitest-environment jsdom
import { expect, test, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/preact";
import { Button } from "../ui/Button.js";
import { IconButton } from "../IconButton.js";

afterEach(() => {
    cleanup();
});

test('button locks width during loading and renders spinner', async () => {
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 150 });

    const { getByRole, rerender } = render(
        <Button isLoading={false}>Action</Button>
    );

    const button = getByRole('button');
    expect(button.getAttribute('aria-busy')).not.toBe('true');
    expect(button.style.width).toBe('');

    rerender(
        <Button isLoading={true}>Action</Button>
    );

    const loadingButton = getByRole('button');
    expect(loadingButton.getAttribute('aria-busy')).toBe('true');
    expect(loadingButton.style.width).toBe('150px');
});

test('IconButton locks interaction during pending and sets proper aria attributes', () => {
    const onClick = vi.fn();
    const { getByRole, rerender } = render(
        <IconButton onClick={onClick}>Icon</IconButton>
    );

    const button = getByRole('button');
    expect(button.getAttribute('aria-busy')).not.toBe('true');
    expect(button.getAttribute('aria-disabled')).not.toBe('true');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalled();

    onClick.mockClear();

    rerender(
        <IconButton pending onClick={onClick}>Icon</IconButton>
    );

    const pendingButton = getByRole('button');
    expect(pendingButton.getAttribute('aria-busy')).toBe('true');
    expect(pendingButton.getAttribute('aria-disabled')).toBe('true');
    expect(pendingButton.hasAttribute('disabled')).toBe(false);

    fireEvent.click(pendingButton);
    expect(onClick).not.toHaveBeenCalled();
});
