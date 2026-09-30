import { describe, expect, it } from 'vitest';
import {
  classifyDrop,
  firstUriListEntry,
  parseWebLink,
  previewDrag,
  type IDroppedFileLike,
} from './classify-drop';

function file(name: string, type = '', size = 10): IDroppedFileLike {
  return { name, type, size };
}

/** A DataTransfer-shaped drop payload built from files and string entries. */
function drop(files: IDroppedFileLike[] = [], strings: Record<string, string> = {}) {
  return {
    files,
    types: [...(files.length ? ['Files'] : []), ...Object.keys(strings)],
    getData: (format: string) => strings[format] ?? '',
  };
}

describe('parseWebLink', () => {
  it.each([
    ['https://anilist.co/anime/1', 'https://anilist.co/anime/1'],
    ['http://example.com', 'http://example.com/'],
    ['  https://example.com/a?b=c#d  ', 'https://example.com/a?b=c#d'],
    ['HTTPS://EXAMPLE.COM/Path', 'https://example.com/Path'],
  ])('accepts %s', (input, expected) => {
    expect(parseWebLink(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'file:///etc/passwd',
    'data:text/html,<script>alert(1)</script>',
    'shiroani://settings',
    'shiroani-bg://backgrounds/x.png',
    'ftp://example.com',
    'about:blank',
    'example.com',
    'just some words',
    'https://example.com and more',
    '',
    'https://user:pass@example.com/',
    'https://anilist.co@evil.example/',
    'http://:secret@example.com/',
  ])('rejects %s', input => {
    expect(parseWebLink(input)).toBeNull();
  });
});

describe('firstUriListEntry', () => {
  it('skips comment and blank lines', () => {
    expect(firstUriListEntry('# comment\r\n\r\nhttps://a.example\r\nhttps://b.example')).toBe(
      'https://a.example'
    );
  });

  it('returns null when only comments are present', () => {
    expect(firstUriListEntry('# only a comment\n')).toBeNull();
  });
});

describe('classifyDrop', () => {
  describe('links', () => {
    it('reads the first entry of text/uri-list', () => {
      expect(
        classifyDrop(
          drop([], {
            'text/uri-list': '#title\nhttps://anilist.co/anime/1\nhttps://evil.example',
            'text/plain': 'https://ignored.example',
          })
        )
      ).toEqual({ kind: 'link', url: 'https://anilist.co/anime/1' });
    });

    it('falls back to text/plain when there is no uri-list', () => {
      expect(classifyDrop(drop([], { 'text/plain': ' https://example.com/x ' }))).toEqual({
        kind: 'link',
        url: 'https://example.com/x',
      });
    });

    it('rejects a disallowed protocol in the uri-list without falling back to text/plain', () => {
      expect(
        classifyDrop(
          drop([], {
            'text/uri-list': 'javascript:alert(1)',
            'text/plain': 'https://example.com',
          })
        )
      ).toEqual({ kind: 'unsupported', reason: 'text' });
    });

    it.each(['file:///Users/me/secret.txt', 'data:text/html,hi', 'shiroani://x'])(
      'rejects %s from text/uri-list',
      url => {
        expect(classifyDrop(drop([], { 'text/uri-list': url }))).toEqual({
          kind: 'unsupported',
          reason: 'text',
        });
      }
    );

    it('treats plain text that is not a URL as unsupported', () => {
      expect(classifyDrop(drop([], { 'text/plain': 'Frieren episode 12' }))).toEqual({
        kind: 'unsupported',
        reason: 'text',
      });
    });
  });

  describe('files', () => {
    it('detects a ShiroAni export by its .json extension', () => {
      const exportFile = file('shiroani-export.JSON', 'application/json');
      expect(classifyDrop(drop([exportFile]))).toEqual({ kind: 'json', file: exportFile });
    });

    it('accepts a .json file with no MIME type (some OS drags report none)', () => {
      const exportFile = file('backup.json');
      expect(classifyDrop(drop([exportFile]))).toEqual({ kind: 'json', file: exportFile });
    });

    it('does not treat a non-JSON file named .json as JSON', () => {
      expect(classifyDrop(drop([file('trick.json', 'application/x-msdownload')]))).toEqual({
        kind: 'unsupported',
        reason: 'file-type',
      });
    });

    it.each([
      ['wallpaper.png', 'image/png'],
      ['photo.JPG', 'image/jpeg'],
      ['photo.jpeg', 'image/jpeg'],
      ['dance.gif', 'image/gif'],
      ['sprite.webp', 'image/webp'],
      ['no-mime.png', ''],
    ])('detects the image %s (%s)', (name, type) => {
      const image = file(name, type);
      expect(classifyDrop(drop([image]))).toEqual({ kind: 'image', file: image });
    });

    it.each([
      ['photo.heic', 'image/heic'],
      ['vector.svg', 'image/svg+xml'],
      ['renamed.png', 'application/pdf'],
      ['notes.txt', 'text/plain'],
      ['archive.zip', ''],
      ['no-extension', ''],
    ])('rejects %s (%s)', (name, type) => {
      expect(classifyDrop(drop([file(name, type)]))).toEqual({
        kind: 'unsupported',
        reason: 'file-type',
      });
    });

    it('prefers the file over the link when a web image carries both', () => {
      const image = file('cat.png', 'image/png');
      expect(
        classifyDrop(drop([image], { 'text/uri-list': 'https://example.com/cat.png' }))
      ).toEqual({ kind: 'image', file: image });
    });

    it('rejects several files at once', () => {
      expect(classifyDrop(drop([file('a.png', 'image/png'), file('b.png', 'image/png')]))).toEqual({
        kind: 'unsupported',
        reason: 'multiple',
      });
    });
  });

  it('reports an empty drop', () => {
    expect(classifyDrop(drop())).toEqual({ kind: 'unsupported', reason: 'empty' });
    expect(classifyDrop(drop([], { 'text/plain': '   ' }))).toEqual({
      kind: 'unsupported',
      reason: 'empty',
    });
  });
});

describe('previewDrag', () => {
  const items = (...types: string[]) => types.map(type => ({ kind: 'file', type }));

  it.each([
    [{ types: ['Files'], items: items('image/png') }, 'image'],
    [{ types: ['Files'], items: items('application/json') }, 'json'],
    [{ types: ['Files'], items: items('') }, 'unknown'],
    [{ types: ['Files'], items: items('application/pdf') }, 'unsupported'],
    [{ types: ['Files'], items: items('image/png', 'image/png') }, 'unsupported'],
    [{ types: ['Files'] }, 'unknown'],
    [{ types: ['text/uri-list', 'text/plain'] }, 'link'],
    [{ types: ['text/plain'] }, 'unknown'],
    [{ types: [] }, 'unsupported'],
  ] as const)('%o previews as %s', (data, expected) => {
    expect(previewDrag(data)).toBe(expected);
  });
});
