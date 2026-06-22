type JsonLdScriptProps = {
  data: unknown;
};

const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, '\\u003c');

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
