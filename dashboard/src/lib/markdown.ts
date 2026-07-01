import { marked } from "marked";

const renderer = new marked.Renderer();
renderer.html = () => "";

const isSafe = (url: string, allowedProtocols: string[]): boolean => {
  try {
    let decoded = url.trim();
    // decode trick encodings
    decoded = decodeURI(decoded);

    // reject control characters
    if (/[\x00-\x1F\x7F]/.test(decoded)) {
      return false;
    }

    // reject protocol-relative URLs
    if (decoded.startsWith("//")) {
      return false;
    }

    if (decoded.startsWith("/") || decoded.startsWith("#") || decoded.startsWith("?")) {
      return true;
    }

    // Try parsing as absolute URL
    try {
      const parsed = new URL(decoded);
      return allowedProtocols.includes(parsed.protocol);
    } catch {
      // If it fails to parse as absolute, we need to be extremely strict to avoid falling back on dummy domains.
      // We will check for dangerous scheme prefixes by stripping out whitespace and non-alphanumeric chars
      const stripped = decoded.replace(/[^a-z0-9:]/gi, '').toLowerCase();
      if (stripped.startsWith('javascript:') || stripped.startsWith('vbscript:') || stripped.startsWith('data:')) {
          return false;
      }

      // We only allow relative paths that parse cleanly with a dummy origin.
      const parsedRelative = new URL(decoded, "http://dummy.com");
      return parsedRelative.protocol === "http:";
    }
  } catch {
    return false;
  }
};

const isAnchorUrlSafe = (url: string): boolean => {
  return isSafe(url, ["http:", "https:", "mailto:"]);
};

const isImageUrlSafe = (url: string): boolean => {
  return isSafe(url, ["http:", "https:"]);
};

const escapeHtml = (html: string): string => {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// Replace html entities before validating, to catch named ones like &Tab;, &NewLine;, &colon;, and numeric ones.
const decodeHtmlEntitiesStrict = (html: string): string => {
    let res = html;
    try {
        res = res.replace(/&#x([0-9a-fA-F]+);?/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        res = res.replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
        // Also handle some common named entities that can be used for obfuscation in URL schemes
        res = res.replace(/&tab;/gi, "\t");
        res = res.replace(/&newline;/gi, "\n");
        res = res.replace(/&colon;/gi, ":");
    } catch {}
    return res;
};

renderer.link = function (token) {
  const { href, title, tokens } = token;
  const parsedText = this.parser.parseInline(tokens);

  let decodedHref = decodeHtmlEntitiesStrict(href);

  if (!isAnchorUrlSafe(decodedHref)) {
    return parsedText;
  }

  let out = `<a href="${escapeHtml(href.trim())}"`;
  if (title) {
    out += ` title="${escapeHtml(title)}"`;
  }

  if (/^https?:\/\//i.test(href.trim()) || href.trim().startsWith("//")) {
    out += ` rel="noopener noreferrer"`;
  }

  out += `>${parsedText}</a>`;
  return out as any;
};

renderer.image = function (token) {
  const { href, title, text } = token;

  let decodedHref = decodeHtmlEntitiesStrict(href);

  if (!isImageUrlSafe(decodedHref)) {
    return escapeHtml(text);
  }

  let out = `<img src="${escapeHtml(href.trim())}" alt="${escapeHtml(text)}"`;
  if (title) {
    out += ` title="${escapeHtml(title)}"`;
  }
  out += ">";
  return out as any;
};

export const renderMarkdown = (text?: string): string => {
  if (!text) return "";
  return marked.parse(text, { renderer }) as string;
};
