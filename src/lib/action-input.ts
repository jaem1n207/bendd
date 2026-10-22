export type ActionInputSchema = {
  type: string;
  properties?: Record<string, ActionInputSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: readonly string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  default?: string | number | boolean;
};

// The site's action inputs are flat scalar objects. Normalize strings once.
export function parseActionInput(schema: ActionInputSchema, input: unknown) {
  const fail = (error: string) => ({ ok: false as const, error });
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fail('입력은 object여야 합니다.');
  }
  const fields = schema.properties ?? {};
  const supplied = input as Record<string, unknown>;
  if (Object.keys(supplied).some(key => !Object.hasOwn(fields, key))) {
    return fail('정의되지 않은 입력 필드입니다.');
  }
  const value: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    if (!Object.hasOwn(supplied, key)) {
      if (schema.required?.includes(key)) {
        return fail(`${key} 값이 필요합니다.`);
      }
      if (field.default !== undefined) {
        value[key] = field.default;
      }
      continue;
    }
    const raw = supplied[key];
    const item = typeof raw === 'string' ? raw.trim() : raw;
    const valid =
      field.type === 'integer'
        ? typeof item === 'number' &&
          Number.isInteger(item) &&
          item >= (field.minimum ?? -Infinity) &&
          item <= (field.maximum ?? Infinity)
        : typeof item === field.type;
    if (
      !valid ||
      (field.enum && !field.enum.includes(item as string)) ||
      (typeof item === 'string' && item.length < (field.minLength ?? 0))
    ) {
      return fail(`${key} 값이 올바르지 않습니다.`);
    }
    value[key] = item;
  }
  return { ok: true as const, value };
}
