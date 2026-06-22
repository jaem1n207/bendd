import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JsonLdScript } from '@/components/structured-data/json-ld-script';

describe('JsonLdScript', () => {
  it('serializes JSON-LD and escapes HTML-sensitive angle brackets', () => {
    const { container } = render(
      <JsonLdScript
        data={{
          '@context': 'https://schema.org',
          '@type': 'Thing',
          name: '<script>alert("x")</script>',
        }}
      />
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]'
    );

    expect(script?.innerHTML).toContain('\\u003cscript>');
    expect(script?.innerHTML).not.toContain('<script>alert');
    expect(JSON.parse(script?.innerHTML ?? '{}')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Thing',
      name: '<script>alert("x")</script>',
    });
  });

  it('throws a clear error when data cannot be serialized', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    try {
      expect(() => render(<JsonLdScript data={undefined} />)).toThrow(
        'JsonLdScript data must be JSON-serializable.'
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
