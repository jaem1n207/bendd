export type WebMCPJSONSchema = {
  type: string;
  properties?: Record<string, WebMCPJSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: readonly string[];
  const?: string | number | boolean;
  title?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  anyOf?: readonly WebMCPJSONSchema[];
  oneOf?: readonly WebMCPJSONSchema[];
};

export type WebMCPToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
  untrustedContentHint?: boolean;
};

export type WebMCPModelContextClient = {
  requestUserInteraction?: (options?: { message?: string }) => Promise<void>;
};

export type WebMCPToolDescriptor<Input = unknown, Output = unknown> = {
  name: string;
  title?: string;
  description: string;
  inputSchema: WebMCPJSONSchema;
  annotations?: WebMCPToolAnnotations;
  execute: (
    input: Input,
    client: WebMCPModelContextClient
  ) => Output | Promise<Output>;
};

export type AnyWebMCPToolDescriptor = Omit<
  WebMCPToolDescriptor<never, unknown>,
  'execute'
> & {
  execute: (
    input: never,
    client: WebMCPModelContextClient
  ) => unknown | Promise<unknown>;
};

export type WebMCPRegisterOptions = {
  signal?: AbortSignal;
  exposedTo?: readonly string[];
};

export type WebMCPModelContext = {
  registerTool: (
    tool: AnyWebMCPToolDescriptor,
    options?: WebMCPRegisterOptions
  ) => void;
};

declare global {
  interface Navigator {
    modelContext?: WebMCPModelContext;
  }
}

declare module 'react' {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: boolean | '';
  }

  interface HTMLAttributes<T> {
    toolparamtitle?: string;
    toolparamdescription?: string;
  }
}
