// Server component: renders a single JSON-LD <script> tag. JSON.stringify already
// escapes quotes; replacing "<" stops a literal "</script>" inside content from
// breaking out of the tag.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
