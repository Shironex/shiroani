import { useCallback, useEffect, useMemo, useState } from 'react';
import { GITHUB_RELEASES_API_URL, GITHUB_RELEASES_URL } from '@shiroani/shared';
import { currentVersion } from '../lib/releases';
import { useLandingLang } from '../lib/useLandingLang';
import { t as translate } from '../lib/i18n';

type Platform = 'win' | 'mac';

interface ReleaseAsset {
  name: string;
  size: number;
  browser_download_url: string;
}

interface ReleaseData {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
}

interface PlatformSpec {
  key: Platform;
  labelKey: string;
  extension: string;
  pattern: RegExp;
}

const PLATFORMS: PlatformSpec[] = [
  { key: 'win', labelKey: 'dlp.platform.win', extension: '.exe', pattern: /\.exe$/i },
  { key: 'mac', labelKey: 'dlp.platform.mac', extension: '.dmg', pattern: /\.dmg$/i },
];

// Electron-builder ships filenames like "ShiroAni-0.5.0-arm64.dmg" or
// "ShiroAni.Setup.exe". Pull the arch token when present; otherwise label
// the binary by extension only.
function parseArch(filename: string): string | null {
  const match = filename.match(/(arm64|aarch64|x64|x86_64|ia32|universal)/i);
  if (!match) return null;
  const token = match[1].toLowerCase();
  if (token === 'arm64' || token === 'aarch64') return 'ARM64';
  if (token === 'x64' || token === 'x86_64') return 'x64';
  if (token === 'ia32') return '32-bit';
  return 'Universal';
}

const MAC_QUARANTINE_CMD = 'xattr -rd com.apple.quarantine /Applications/ShiroAni.app';

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'win';
  return navigator.userAgent.toLowerCase().includes('mac') ? 'mac' : 'win';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReleaseDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

const WinIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 5.5 10.5 4.2v8H3V5.5zm0 13 7.5 1.3v-8H3v6.7zM11.5 20l9.5 1.7V11.5h-9.5V20zM11.5 4l9.5-1.7v9.2h-9.5V4z" />
  </svg>
);

const MacIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.3 12.6c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.9-1.7 0-3.2 1-4 2.5-1.7 3-.4 7.4 1.2 9.9.8 1.2 1.8 2.5 3 2.4 1.2-.1 1.6-.8 3.1-.8 1.4 0 1.9.8 3.2.7 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-.9-2.5-3.8zM15 4.8c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.3-.6 2.9-1.3z" />
  </svg>
);

function formatTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? vars[name] : `{${name}}`
  );
}

export function DownloadPage() {
  const lang = useLandingLang();
  const t = (key: string) => translate(key, lang);

  const fallbackVersion = currentVersion();
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [error, setError] = useState(false);
  const [detected] = useState<Platform>(detectPlatform);
  const [downloaded, setDownloaded] = useState<Platform | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(GITHUB_RELEASES_API_URL, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ReleaseData>;
      })
      .then(setRelease)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(true);
      });
    return () => ctrl.abort();
  }, []);

  const assets = useMemo(() => {
    const map = new Map<Platform, ReleaseAsset>();
    if (!release) return map;
    for (const p of PLATFORMS) {
      const asset = release.assets.find(a => p.pattern.test(a.name));
      if (asset) map.set(p.key, asset);
    }
    return map;
  }, [release]);

  const onCopyCmd = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(MAC_QUARANTINE_CMD)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const version = release?.tag_name?.replace(/^v/i, '') || fallbackVersion;
  const releasedOn = release ? formatReleaseDate(release.published_at, t('dlp.dateLocale')) : null;

  return (
    <>
      <header className="dlp-hdr">
        <div className="kanji-bg" aria-hidden="true">
          配信
        </div>
        <span className="eyebrow">
          <span className="blip" aria-hidden="true"></span>v{version}
          {releasedOn && (
            <>
              {' '}
              · {t('dlp.eyebrow.released')} {releasedOn}
            </>
          )}
        </span>
        <h1>
          {t('dlp.heading.lead')} <em>{t('dlp.heading.em')}</em>
          {t('dlp.heading.tail')}
        </h1>
        <p className="sub">{t('dlp.sub')}</p>
      </header>

      <section className="dlp-body" aria-label={t('dlp.aria.section')}>
        {error ? (
          <div className="dlp-error">
            <p>{t('dlp.error.message')}</p>
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="dlp-btn dlp-btn-primary"
            >
              {t('dlp.error.cta')} <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : (
          <div className="dlp-grid">
            {PLATFORMS.map(p => {
              const asset = assets.get(p.key);
              const isPrimary = p.key === detected;
              const href = asset?.browser_download_url ?? GITHUB_RELEASES_URL;
              const external = !asset;
              const size = asset ? formatBytes(asset.size) : null;
              const platformLabel = t(p.labelKey);
              const ariaLabel = asset
                ? formatTemplate(t('dlp.aria.download'), {
                    platform: platformLabel,
                    ext: p.extension,
                    size: size ?? '',
                  })
                : formatTemplate(t('dlp.aria.openRelease'), { platform: platformLabel });
              return (
                <a
                  key={p.key}
                  href={href}
                  onClick={asset ? () => setDownloaded(p.key) : undefined}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  aria-label={ariaLabel}
                  className={
                    'dlp-card' + (isPrimary ? ' is-primary' : '') + (!release ? ' is-loading' : '')
                  }
                >
                  <span className="pico" aria-hidden="true">
                    {p.key === 'win' ? <WinIcon /> : <MacIcon />}
                  </span>
                  <div className="pbody">
                    <div className="pn">
                      {platformLabel}
                      {isPrimary && <span className="pbadge">{t('dlp.your')}</span>}
                    </div>
                    <div className="ps">
                      {release && asset && size ? (
                        <>
                          {p.extension}
                          {parseArch(asset.name) && <> · {parseArch(asset.name)}</>} · {size}
                        </>
                      ) : release && !asset ? (
                        <>{t('dlp.notAvailable')}</>
                      ) : (
                        <span className="pskel">{t('dlp.loading')}</span>
                      )}
                    </div>
                  </div>
                  <span className="parr" aria-hidden="true">
                    ↓
                  </span>
                </a>
              );
            })}
          </div>
        )}

        <div className="dlp-sr" role="status" aria-live="polite">
          {downloaded
            ? formatTemplate(t('dlp.sr.started'), {
                platform: downloaded === 'win' ? t('dlp.platform.win') : t('dlp.platform.mac'),
              })
            : ''}
        </div>

        <div className="dlp-notes">
          <aside className="dlp-note">
            <div className="nhead">
              <span className="ndot" aria-hidden="true"></span>
              {t('dlp.note.win.title')}
            </div>
            <p>
              {t('dlp.note.win.body.lead')} <b>{t('dlp.note.win.body.warn')}</b>
              {t('dlp.note.win.body.tail')} <b>{t('dlp.note.win.body.more')}</b>
              {t('dlp.note.win.body.then')} <b>{t('dlp.note.win.body.run')}</b>
              {t('dlp.note.win.body.dot')}
            </p>
            <p className="nmeta">{t('dlp.note.win.meta')}</p>
          </aside>

          <aside className="dlp-note">
            <div className="nhead">
              <span className="ndot" aria-hidden="true"></span>
              {t('dlp.note.mac.title')}
            </div>
            <p>
              {t('dlp.note.mac.body.lead')} <b>{t('dlp.note.mac.body.applications')}</b>{' '}
              {t('dlp.note.mac.body.tail')}
            </p>
            <div className="ncode">
              <code>{MAC_QUARANTINE_CMD}</code>
              <button type="button" onClick={onCopyCmd} aria-label={t('dlp.note.mac.copyAria')}>
                {copied ? t('dlp.note.mac.copied') : t('dlp.note.mac.copy')}
              </button>
            </div>
            <p className="nmeta">{t('dlp.note.mac.meta')}</p>
          </aside>
        </div>

        <div className="dlp-links">
          <a href="/changelog" className="dlp-btn">
            <span aria-hidden="true">≡</span>
            <span>{t('dlp.links.changelog')}</span>
          </a>
          <a
            href={release?.html_url ?? GITHUB_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="dlp-btn"
          >
            <span aria-hidden="true">↗</span>
            <span>{t('dlp.links.fullRelease')}</span>
          </a>
        </div>
      </section>
    </>
  );
}
