// The legal pages are generated HTML (Termly) with a few stray </div> tags and some unclosed <div>s.
// A browser parsing the whole page lets a stray closing tag break out of its container, while the same
// string set into a container on the client cannot; React then sees two different pages and rebuilds the
// whole tree (which also drops the light/dark attribute). Balancing the divs keeps both parses identical.
export const balanceDivs = (html: string) => {
  let depth = 0;
  const out = html.replace(/<(\/?)div\b[^>]*>/gi, (tag, closing) => {
    if (closing) {
      if (depth === 0) return "";
      depth--;
      return tag;
    }
    depth++;
    return tag;
  });
  return out + "</div>".repeat(depth);
};
