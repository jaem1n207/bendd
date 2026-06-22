import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JsonLdScript } from './json-ld-script';

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
  });
});
