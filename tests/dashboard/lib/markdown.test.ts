import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../../dashboard/src/lib/markdown';

describe('markdown', () => {
  it('renders safe relative links', () => {
    expect(renderMarkdown('[link](/path)')).toContain('<a href="/path">link</a>');
    expect(renderMarkdown('[link](path/to/file)')).toContain('<a href="path/to/file">link</a>');
  });

  it('renders safe external links with rel', () => {
    const rendered = renderMarkdown('[link](https://example.com)');
    expect(rendered).toContain('rel="noopener noreferrer"');
    expect(rendered).toContain('href="https://example.com"');
  });

  it('rejects protocol-relative and UNC urls', () => {
    expect(renderMarkdown('[link](//example.com)')).not.toContain('<a href');
    expect(renderMarkdown('![image](//example.com/img.png)')).not.toContain('<img');
    expect(renderMarkdown('[link](\\\\example.com)')).not.toContain('<a href');
  });

  it('rejects javascript urls and tricks', () => {
    expect(renderMarkdown('[link](javascript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](java\nscript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](java\r\nscript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](java\tscript:alert(1))')).not.toContain('<a href');

    // HTML entities
    expect(renderMarkdown('[link](java&#10;script:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](java&#x0A;script:alert(1))')).not.toContain('<a href');

    // Encoded trick
    expect(renderMarkdown('[link](javascript%3Aalert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](java%0Ascript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](javascript:alert(1)%00)')).not.toContain('<a href');

    // Spaces
    expect(renderMarkdown('[link]( javascript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](javascript:alert(1) )')).not.toContain('<a href');
  });

  it('rejects named entity trick encodings', () => {
    expect(renderMarkdown('[link](java&Tab;script:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](java&NewLine;script:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](javascript&colon;alert(1))')).not.toContain('<a href');
  });

  it('rejects vbscript and data urls in links', () => {
    expect(renderMarkdown('[link](vbscript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)')).not.toContain('<a href');
  });

  it('strips raw HTML', () => {
    const rendered = renderMarkdown('Some text <script>alert(1)</script> <a href="javascript:alert(2)">link</a>');
    expect(rendered).not.toContain('<script>');
    expect(rendered).not.toContain('<a href');
  });

  it('allows mailto in links but not images', () => {
    expect(renderMarkdown('[mail](mailto:test@example.com)')).toContain('<a href="mailto:test@example.com"');
    expect(renderMarkdown('![mailimg](mailto:test@example.com)')).not.toContain('<img');
  });

  it('renders safe images', () => {
    expect(renderMarkdown('![img](/path/to/img.png)')).toContain('<img src="/path/to/img.png"');
    expect(renderMarkdown('![img](path/to/img.png)')).toContain('<img src="path/to/img.png"');
    expect(renderMarkdown('![img](https://example.com/img.png)')).toContain('<img src="https://example.com/img.png"');
  });

  it('rejects control characters', () => {
    expect(renderMarkdown('[link](\x01javascript:alert(1))')).not.toContain('<a href');
    expect(renderMarkdown('[link](https://example.com\x00)')).not.toContain('<a href');
  });

  it('rejects malformed urls', () => {
    expect(renderMarkdown('[link](https://example.com/%00)')).not.toContain('<a href');
  });
});
