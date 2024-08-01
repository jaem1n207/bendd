import React, { ComponentType, ReactElement } from 'react';

type ValidatorFunction<P> = (
  props: P,
  componentName: string
) => string | undefined;

export function createMDXComponent<P extends {}>(
  Component: ComponentType<P>,
  validator: ValidatorFunction<P>
): (props: P) => ReactElement {
  const componentName = Component.displayName || Component.name || 'Component';

  const MDXComponent = (props: P): ReactElement => {
    if (process.env.VERCEL_ENV !== 'production') {
      const error = validator(props, componentName);
      if (error) {
        throw new Error(`[MDX Component Error] ${componentName}: ${error}`);
      }
    }
    return React.createElement(Component, props);
  };

  MDXComponent.displayName = `MDX${componentName}`;

  return MDXComponent;
}

type PropValidator<T> = (value: T) => boolean;

function getTypeName(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (
    typeof value === 'object' &&
    value.constructor &&
    value.constructor.name
  ) {
    return value.constructor.name;
  }
  return typeof value;
}

export function createPropValidator<P extends object>(
  requiredProps: (keyof P)[],
  propTypes: { [K in keyof P]?: PropValidator<P[K]> }
) {
  return (props: P) => {
    for (const prop of requiredProps) {
      if (!(prop in props)) {
        throw new Error(`필수 prop을 전달하지 않았어요: ${String(prop)}`);
      }
    }

    for (const [key, validator] of Object.entries(propTypes) as [
      keyof P,
      PropValidator<any> | undefined,
    ][]) {
      if (key in props) {
        const value = props[key as keyof P];
        if (!validator?.(value)) {
          const expectedType = propTypes[key as keyof P]?.name || 'unknown';
          const actualType = getTypeName(value);
          throw new TypeError(
            `잘못된 prop의 값을 전달했어요: ${String(key)}. ${actualType} 타입을 전달받았어요.`
          );
        }
      }
    }

    return undefined;
  };
}
