import { parseActionInput, type ActionInputSchema } from '@/lib/action-input';

export const shuffleInputSchema = {
  type: 'object',
  properties: {
    text: { type: 'string', minLength: 1 },
    iterations: { type: 'integer', minimum: 1, maximum: 50 },
    fps: { type: 'integer', minimum: 1, maximum: 60 },
  },
  required: ['text', 'iterations', 'fps'],
  additionalProperties: false,
} satisfies ActionInputSchema;

export type ShuffleInput = { text: string; iterations: number; fps: number };

export function parseShuffleInput(input: unknown) {
  const result = parseActionInput(shuffleInputSchema, input);
  if (!result.ok) {
    return result;
  }
  return { ok: true as const, value: result.value as ShuffleInput };
}
