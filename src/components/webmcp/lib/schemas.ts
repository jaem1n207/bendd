import { shuffleInputSchema } from '@/components/shuffle';
import { parseActionInput } from '@/lib/action-input';
import type {
  WebMCPJSONSchema,
  WebMCPModelContextClient,
  WebMCPToolAnnotations,
  WebMCPToolDescriptor,
} from '@/components/webmcp/types/webmcp';

export type WebMCPToolName =
  | 'navigate_site'
  | 'get_site_context'
  | 'toggle_theme'
  | 'set_sound'
  | 'copy_current_url'
  | 'find_content'
  | 'open_content'
  | 'get_current_content_context'
  | 'open_series'
  | 'jump_to_heading'
  | 'copy_code_block'
  | 'list_page_actions'
  | 'run_shuffle_letters'
  | 'stop_shuffle_letters';

export const emptyObjectSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
} satisfies WebMCPJSONSchema;

const stringSchema = {
  type: 'string',
  minLength: 1,
} satisfies WebMCPJSONSchema;

const numberSchema = (minimum: number, maximum: number) =>
  ({
    type: 'integer',
    minimum,
    maximum,
  }) satisfies WebMCPJSONSchema;

const enumSchema = (values: readonly string[]) =>
  ({
    type: 'string',
    enum: values,
  }) satisfies WebMCPJSONSchema;

export const webMCPSchemas = {
  navigateSite: {
    type: 'object',
    properties: {
      destination: enumSchema([
        'home',
        'article',
        'craft',
        'shuffle-playground',
      ]),
    },
    required: ['destination'],
    additionalProperties: false,
  },
  setSound: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
    },
    required: ['enabled'],
    additionalProperties: false,
  },
  findContent: {
    type: 'object',
    properties: {
      query: stringSchema,
      type: { ...enumSchema(['all', 'article', 'craft']), default: 'all' },
      limit: { ...numberSchema(1, 10), default: 5 },
    },
    required: ['query'],
    additionalProperties: false,
  },
  openContent: {
    type: 'object',
    properties: {
      type: enumSchema(['article', 'craft']),
      slug: stringSchema,
    },
    required: ['type', 'slug'],
    additionalProperties: false,
  },
  openSeries: {
    type: 'object',
    properties: {
      target: enumSchema(['series', 'previous', 'next']),
    },
    required: ['target'],
    additionalProperties: false,
  },
  jumpToHeading: {
    type: 'object',
    properties: {
      headingId: stringSchema,
    },
    required: ['headingId'],
    additionalProperties: false,
  },
  copyCodeBlock: {
    type: 'object',
    properties: {
      index: numberSchema(0, 999),
    },
    required: ['index'],
    additionalProperties: false,
  },
  runShuffleLetters: shuffleInputSchema,
} satisfies Record<string, WebMCPJSONSchema>;

export function createToolDescriptor<Input, Output>({
  name,
  title,
  description,
  inputSchema,
  annotations,
  execute,
}: {
  name: WebMCPToolName;
  title?: string;
  description: string;
  inputSchema: WebMCPJSONSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (
    input: Input,
    client: WebMCPModelContextClient
  ) => Output | Promise<Output>;
}): WebMCPToolDescriptor<unknown, Output | { ok: false; error: string }> {
  return {
    name,
    title,
    description,
    inputSchema,
    annotations,
    execute: (input, client) => {
      const parsed = parseActionInput(inputSchema, input);
      if (!parsed.ok) {
        return parsed;
      }
      return execute(parsed.value as Input, client);
    },
  };
}
