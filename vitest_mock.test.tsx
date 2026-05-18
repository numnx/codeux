import { render } from '@testing-library/preact';
import { expect, test } from 'vitest';
import { SprintKeyEditor } from './dashboard/src/v2/components/settings/SprintKeyEditor';

test('SprintKeyEditor renders correctly and handles values', () => {
  const { container } = render(<SprintKeyEditor value="TEST" onChange={() => {}} />);
  const input = container.querySelector('input');
  expect(input).not.toBeNull();
  expect(input.value).toBe('TEST');
});
