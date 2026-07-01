import { marked } from "marked";

const renderer = new marked.Renderer();
renderer.html = () => "";

// Replaces html entities before validating, to catch named ones like &Tab;, &NewLine;, &colon;, and numeric ones.
const decodeHtmlEntities = (html: string): string => {
    let res = html;
    try {
        res = res.replace(/&#x([0-9a-fA-F]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        res = res.replace(/&#([0-9]+);?/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
        res = res.replace(/&tab;/gi, "\t");
        res = res.replace(/&newline;/gi, "\n");
        res = res.replace(/&colon;/gi, ":");
    } catch {}
    return res;
};

const isSafe = (url: string, allowedProtocols: string[]): boolean => {
  try {
    let decoded = decodeHtmlEntities(url);
    decoded = decoded.trim();

    // Check if original or decoded string contains control characters or space encoded
    if (/[\x00-\x1F\x7F-\x9F]/.test(decoded)) {
        return false;
    }

    let uriDecoded = decoded;
    try {
        uriDecoded = decodeURIComponent(decoded);
        if (/[\x00-\x1F\x7F-\x9F]/.test(uriDecoded)) {
            return false;
        }
    } catch {
        return false; // reject malformed percent encoding
    }

    // reject protocol-relative URLs or UNC paths.
    // marked unescapes \\ to \ in links. So we check for \ as well to prevent UNC.
    if (uriDecoded.startsWith("//") || uriDecoded.startsWith("\\\\") || uriDecoded.startsWith("\\")) {
      return false;
    }

    if (uriDecoded.startsWith("/") || uriDecoded.startsWith("#") || uriDecoded.startsWith("?")) {
      return true;
    }

    const parsed = new URL(uriDecoded, "http://dummy.com");
    if (parsed.origin !== "http://dummy.com") {
        return allowedProtocols.includes(parsed.protocol);
    } else {
        // If it used dummy.com, the protocol should have remained http: (it was a relative path).
        // If it somehow parsed differently but still used dummy.com origin (unlikely), block.
        if (parsed.protocol !== "http:") {
            return false;
        }
        // Since it used dummy.com, it didn't have a protocol itself.
        // Let's strip whitespace/alphanumeric and check for trick schemes again just in case
        const stripped = uriDecoded.replace(/[^a-z0-9:]/gi, '').toLowerCase();
        if (stripped.startsWith('javascript:') || stripped.startsWith('vbscript:') || stripped.startsWith('data:')) {
            return false;
        }
        return true;
    }
  } catch {
    return false; // Reject malformed URLs
  }
};

const isLinkUrlSafe = (url: string): boolean => {
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

renderer.link = function (token) {
  const { href, title, tokens } = token;
  const parsedText = this.parser.parseInline(tokens);

  if (!isLinkUrlSafe(href)) {
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

  if (!isImageUrlSafe(href)) {
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
