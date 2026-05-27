import type {
  WebMCPJSONSchema,
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
} satisfies WebMCPJSONSchema;

const numberSchema = (minimum: number, maximum: number) =>
  ({
    type: 'number',
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
      type: enumSchema(['all', 'article', 'craft']),
      limit: numberSchema(1, 10),
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
  runShuffleLetters: {
    type: 'object',
    properties: {
      text: stringSchema,
      iterations: numberSchema(1, 50),
      fps: numberSchema(1, 60),
    },
    required: ['text', 'iterations', 'fps'],
    additionalProperties: false,
  },
} satisfies Record<string, WebMCPJSONSchema>;

export function createToolDescriptor<Input, Output>({
  name,
  description,
  inputSchema,
  annotations,
  execute,
}: {
  name: WebMCPToolName;
  description: string;
  inputSchema: WebMCPJSONSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (input: Input) => Output | Promise<Output>;
}): WebMCPToolDescriptor<Input, Output> {
  return {
    name,
    description,
    inputSchema,
    annotations,
    execute,
  };
}
