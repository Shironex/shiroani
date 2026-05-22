import { describe, it, expect } from 'vitest';
import { sanitizeArticleHtml } from '../sanitize-html';

const BASE = 'https://example.com/articles/post';

describe('sanitizeArticleHtml', () => {
  it('returns empty string for empty/nullish input', () => {
    expect(sanitizeArticleHtml('')).toBe('');
    expect(sanitizeArticleHtml('   ')).toBe('');
    expect(sanitizeArticleHtml(null)).toBe('');
    expect(sanitizeArticleHtml(undefined)).toBe('');
  });

  it('keeps allowed formatting tags', () => {
    const out = sanitizeArticleHtml('<p>Hello <strong>world</strong> and <em>more</em></p>');
    expect(out).toContain('<p>');
    expect(out).toContain('<strong>world</strong>');
    expect(out).toContain('<em>more</em>');
  });

  it('strips <script> tags entirely', () => {
    const out = sanitizeArticleHtml('<p>safe</p><script>alert(1)</script>');
    expect(out).toContain('safe');
    expect(out.toLowerCase()).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
  });

  it('removes inline event handlers like onerror', () => {
    const out = sanitizeArticleHtml('<img src="https://cdn.example.com/x.jpg" onerror="alert(1)">');
    expect(out.toLowerCase()).not.toContain('onerror');
    expect(out).not.toContain('alert(1)');
  });

  it('strips iframes', () => {
    const out = sanitizeArticleHtml(
      '<p>text</p><iframe src="https://youtube.com/embed/x"></iframe>'
    );
    expect(out).toContain('text');
    expect(out.toLowerCase()).not.toContain('<iframe');
  });

  it('neutralises javascript: links', () => {
    const out = sanitizeArticleHtml('<a href="javascript:alert(1)">click</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
    expect(out).toContain('click');
  });

  it('forces target=_blank and rel on links', () => {
    const out = sanitizeArticleHtml('<a href="https://other.example.com/x">link</a>');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });

  it('resolves relative link hrefs against the base URL', () => {
    const out = sanitizeArticleHtml('<a href="/other">link</a>', BASE);
    expect(out).toContain('href="https://example.com/other"');
  });

  it('promotes lazy data-src images to a real src', () => {
    const out = sanitizeArticleHtml(
      '<img data-src="https://cdn.example.com/lazy.jpg" alt="x">',
      BASE
    );
    expect(out).toContain('src="https://cdn.example.com/lazy.jpg"');
    expect(out).not.toContain('data-src');
  });

  it('takes the first candidate from srcset when src is absent', () => {
    const out = sanitizeArticleHtml(
      '<img srcset="https://cdn.example.com/a.jpg 1x, https://cdn.example.com/b.jpg 2x">',
      BASE
    );
    expect(out).toContain('src="https://cdn.example.com/a.jpg"');
    expect(out).not.toContain('srcset');
  });

  it('resolves relative image sources to absolute https URLs', () => {
    const out = sanitizeArticleHtml('<img src="/img/cover.jpg">', BASE);
    expect(out).toContain('src="https://example.com/img/cover.jpg"');
  });

  it('drops images that cannot resolve to an https URL', () => {
    const out = sanitizeArticleHtml('<img src="http://insecure.example.com/x.jpg">', BASE);
    expect(out.toLowerCase()).not.toContain('<img');
  });

  it('drops 1x1 tracking pixels', () => {
    const out = sanitizeArticleHtml(
      '<p>body</p><img src="https://track.example.com/p.gif" width="1" height="1">',
      BASE
    );
    expect(out).toContain('body');
    expect(out).not.toContain('track.example.com');
  });

  it('strips inline style attributes', () => {
    const out = sanitizeArticleHtml('<p style="position:fixed">x</p>');
    expect(out).not.toContain('style=');
  });
});
