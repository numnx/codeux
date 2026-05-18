import { render, fireEvent } from '@testing-library/preact';
import { expect, test, vi } from 'vitest';
import { SprintKeyEditor } from './dashboard/src/v2/components/settings/SprintKeyEditor';

test('SprintKeyEditor correctly enforces uppercase alphanumeric format', () => {
  const onChangeMock = vi.fn();
  const { container } = render(<SprintKeyEditor value="" onChange={onChangeMock} />);
  const input = container.querySelector('input')!;

  fireEvent.input(input, { target: { value: 'a!b@c#123' } });

  expect(onChangeMock).toHaveBeenCalledWith('ABC123');
});
