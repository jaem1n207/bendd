type JsonLdScriptProps = {
  data: unknown;
};

const serializeJsonLd = (data: unknown) => {
  const serialized = JSON.stringify(data);

  if (serialized === undefined) {
    throw new Error('JsonLdScript data must be JSON-serializable.');
  }

  return serialized.replace(/</g, '\\u003c');
};

export function JsonLdScript({ data }: JsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}
