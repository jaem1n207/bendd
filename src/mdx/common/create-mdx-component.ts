import { createElement } from 'react';
import { z } from 'zod';
import { fromError } from 'zod-validation-error';

type MDXComponent<T extends z.ZodType> = React.FC<z.infer<T>>;

export function createMDXComponent<T extends z.ZodType>(
  Component: React.FC<z.infer<T>>,
  schema: T
): MDXComponent<T> {
  const MDXComponent: MDXComponent<T> = props => {
    const componentName =
      Component.displayName || Component.name || 'Unknown Component Name';
    validateProps(schema, props, componentName);

    return createElement(Component as React.FC<any>, props as any);
  };

  return MDXComponent;
}

function validateProps<T extends z.ZodType>(
  schema: T,
  props: z.infer<T>,
  componentName: string
) {
  if (process.env.VERCEL_ENV !== 'production') {
    try {
      schema.parse(props);
    } catch (error) {
      throw new Error(`[${componentName} Error]: ${fromError(error)}`);
    }
  }
}
