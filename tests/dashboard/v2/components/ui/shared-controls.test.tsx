// @vitest-environment jsdom
import { expect, test, describe, vi } from "vitest";
import { render } from "@testing-library/preact";
import { Button } from "../../../../../dashboard/src/v2/components/ui/Button.js";
import { Input } from "../../../../../dashboard/src/v2/components/ui/Input.js";
import { Select } from "../../../../../dashboard/src/v2/components/ui/Select.js";
import { Toggle } from "../../../../../dashboard/src/v2/components/ui/Toggle.js";
import { AvantgardeSelect } from "../../../../../dashboard/src/v2/components/ui/AvantgardeSelect.js";
import { FilterStrip } from "../../../../../dashboard/src/v2/components/ui/FilterStrip.js";

// Mock to avoid matchMedia issues
window.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

describe('Shared UI Controls Accessibility and State', () => {

  test('Button accurately propagates disabled and loading states', () => {
    const { getByRole, rerender } = render(<Button>Action</Button>);
    const button = getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('false');
    expect(button.getAttribute('aria-busy')).toBe('false');

    rerender(<Button disabled>Action</Button>);
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');

    rerender(<Button isLoading>Action</Button>);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  test('Input properly surfaces valid/invalid constraints via aria-invalid', () => {
    const { container, rerender } = render(<Input valid={true} />);
    const input = container.querySelector('input');
    expect(input?.getAttribute('aria-invalid')).toBe(null);
    expect(input?.getAttribute('data-valid')).toBe('true');

    rerender(<Input valid={false} />);
    expect(input?.getAttribute('aria-invalid')).toBe('true');
    expect(input?.getAttribute('data-valid')).toBe(null);

    rerender(<Input aria-invalid="true" />);
    expect(input?.getAttribute('aria-invalid')).toBe('true');
  });

  test('Select handles validation affordances natively', () => {
    const { container, rerender } = render(<Select valid={false}><option>A</option></Select>);
    const select = container.querySelector('select');
    expect(select?.getAttribute('aria-invalid')).toBe('true');
  });

  test('Toggle binds aria-disabled with disabled properly', () => {
    const { getByRole } = render(<Toggle value={true} onChange={() => {}} disabled />);
    const toggle = getByRole('switch');
    expect(toggle.hasAttribute('disabled')).toBe(true);
    expect(toggle.getAttribute('aria-disabled')).toBe('true');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  test('AvantgardeSelect trigger surfaces aria-invalid appropriately', () => {
    const { getAllByRole, container } = render(
      <AvantgardeSelect options={[{label: 'Test', value: '1'}]} value="1" onChange={() => {}} valid={false} />
    );
    const triggers = getAllByRole('button');
    const trigger = triggers.find(t => t.hasAttribute('aria-haspopup'));
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    // Ensure className contains our tailwind validity hook
    expect(trigger.className).toContain('border-status-red');
  });

  test('FilterStrip supports disabled options natively via ARIA and attribute', () => {
    const options = [
      { label: 'Active', value: 'active' },
      { label: 'Disabled Tab', value: 'off', disabled: true }
    ];

    const { getAllByRole } = render(
      <FilterStrip options={options} active="active" onChange={() => {}} />
    );

    const tabs = getAllByRole('tab');
    expect(tabs.length).toBe(2);
    expect(tabs[1].getAttribute('aria-disabled')).toBe('true');
    expect(tabs[1].hasAttribute('disabled')).toBe(true);
  });

});
