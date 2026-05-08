import { currentVersion } from '../lib/releases';
import { useT } from '../lib/useLandingLang';

export function Footer() {
  const version = currentVersion();
  const t = useT();
  const year = new Date().getFullYear();
  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-brand">
          <div className="lg">
            <span className="mark">
              <img
                src="/assets/mascot-wave.png"
                alt=""
                loading="lazy"
                decoding="async"
                width="52"
                height="52"
              />
            </span>
            <div className="name">
              ShiroAni
              <small>SHIRO·ANI · v{version}</small>
            </div>
          </div>
          <p>{t('footer.blurb')}</p>
          <div className="s">
            <a
              href="https://github.com/Shironex/shiroani"
              aria-label="GitHub"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6C20.6 21.8 24 17.3 24 12c0-6.6-5.4-12-12-12z" />
              </svg>
            </a>
            <a
              href="https://discord.gg/M3ujRdUJpn"
              aria-label="Discord"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.3 4.4c-1.5-.7-3.2-1.2-4.9-1.4-.2.4-.5 1-.6 1.3-1.8-.3-3.5-.3-5.3 0-.2-.4-.4-1-.6-1.3-1.7.3-3.4.7-4.9 1.5C1 8.9.2 13.3.6 17.6c2 1.5 4 2.4 6 3 .5-.7.9-1.4 1.2-2.1-.7-.2-1.3-.5-2-.9.2-.1.3-.2.5-.4 4 1.8 8.2 1.8 12.1 0 .2.1.3.2.5.4-.6.4-1.3.7-2 .9.4.7.8 1.4 1.2 2.1 2.1-.6 4.1-1.6 6-3 .4-5-1-9.4-3.8-13.2zM8.5 15c-1.2 0-2.2-1.1-2.2-2.4 0-1.3 1-2.4 2.2-2.4s2.2 1.1 2.2 2.4c0 1.3-1 2.4-2.2 2.4zm7 0c-1.2 0-2.2-1.1-2.2-2.4 0-1.3 1-2.4 2.2-2.4s2.2 1.1 2.2 2.4c0 1.3-1 2.4-2.2 2.4z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="ft-col">
          <h4>{t('footer.col.product')}</h4>
          <a href="/#funkcje">{t('footer.link.features')}</a>
          <a href="/#podglad">{t('footer.link.preview')}</a>
          <a href="/#pobierz">{t('footer.link.download')}</a>
        </div>
        <div className="ft-col">
          <h4>{t('footer.col.resources')}</h4>
          <a href="/changelog">{t('footer.link.changelog')}</a>
          <a href="/#faq">{t('footer.link.faq')}</a>
          <a href="https://github.com/Shironex/shiroani" target="_blank" rel="noopener noreferrer">
            {t('footer.link.github')}
          </a>
          <a href="https://discord.gg/M3ujRdUJpn" target="_blank" rel="noopener noreferrer">
            {t('footer.link.discord')}
          </a>
        </div>
        <div className="ft-col">
          <h4>{t('footer.col.suite')}</h4>
          <a href="/#suite">ShiroAni</a>
          <a href="https://shiranami.app" target="_blank" rel="noopener noreferrer">
            Shiranami ↗
          </a>
          <a href="https://kireimanga.app" target="_blank" rel="noopener noreferrer">
            KireiManga ↗
          </a>
        </div>
      </div>
      <div className="ft-btm">
        <div>
          © {year} Shironex · {t('footer.copyright')}
        </div>
        <div>{t('footer.tagline')}</div>
      </div>
    </footer>
  );
}
