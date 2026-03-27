import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    test: {
      include: ['tests/backend/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      include: ['tests/dashboard/lib/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      include: ['tests/dashboard/v2/**/*.test.{ts,tsx}'],
      environment: 'happy-dom',
    },
  },
])
