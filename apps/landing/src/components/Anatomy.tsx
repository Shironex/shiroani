import { useState } from 'react';
import type { SupportedLanguage } from '../lib/i18n';
import { useT } from '../lib/useLandingLang';

type Pin = { x: number; y: number; titleKey: string; textKey: string };
type TabKey = 'library' | 'schedule' | 'newtab' | 'settings';

const ANA: Record<
  TabKey,
  { src: string; titleKey: string; labelKey: string; viewLabelKey: string; pins: Pin[] }
> = {
  library: {
    src: '/assets/screenshot_library.webp',
    titleKey: 'anatomy.title.library',
    labelKey: 'anatomy.tab.library',
    viewLabelKey: 'anatomy.viewLabel.library',
    pins: [
      { x: 12, y: 6, titleKey: 'anatomy.library.pin1.title', textKey: 'anatomy.library.pin1.text' },
      { x: 87, y: 5, titleKey: 'anatomy.library.pin2.title', textKey: 'anatomy.library.pin2.text' },
      {
        x: 10,
        y: 22,
        titleKey: 'anatomy.library.pin3.title',
        textKey: 'anatomy.library.pin3.text',
      },
      {
        x: 28,
        y: 40,
        titleKey: 'anatomy.library.pin4.title',
        textKey: 'anatomy.library.pin4.text',
      },
    ],
  },
  schedule: {
    src: '/assets/screenshot_schedule.webp',
    titleKey: 'anatomy.title.schedule',
    labelKey: 'anatomy.tab.schedule',
    viewLabelKey: 'anatomy.viewLabel.schedule',
    pins: [
      {
        x: 5,
        y: 11,
        titleKey: 'anatomy.schedule.pin1.title',
        textKey: 'anatomy.schedule.pin1.text',
      },
      {
        x: 21,
        y: 15,
        titleKey: 'anatomy.schedule.pin2.title',
        textKey: 'anatomy.schedule.pin2.text',
      },
      {
        x: 28,
        y: 38,
        titleKey: 'anatomy.schedule.pin3.title',
        textKey: 'anatomy.schedule.pin3.text',
      },
    ],
  },
  newtab: {
    src: '/assets/screenshot_newtab.webp',
    titleKey: 'anatomy.title.newtab',
    labelKey: 'anatomy.tab.newtab',
    viewLabelKey: 'anatomy.viewLabel.newtab',
    pins: [
      { x: 22, y: 18, titleKey: 'anatomy.newtab.pin1.title', textKey: 'anatomy.newtab.pin1.text' },
      { x: 50, y: 31, titleKey: 'anatomy.newtab.pin2.title', textKey: 'anatomy.newtab.pin2.text' },
      { x: 25, y: 57, titleKey: 'anatomy.newtab.pin3.title', textKey: 'anatomy.newtab.pin3.text' },
    ],
  },
  settings: {
    src: '/assets/screenshot_settings.webp',
    titleKey: 'anatomy.title.settings',
    labelKey: 'anatomy.tab.settings',
    viewLabelKey: 'anatomy.viewLabel.settings',
    pins: [
      {
        x: 7,
        y: 50,
        titleKey: 'anatomy.settings.pin1.title',
        textKey: 'anatomy.settings.pin1.text',
      },
      {
        x: 22,
        y: 19,
        titleKey: 'anatomy.settings.pin2.title',
        textKey: 'anatomy.settings.pin2.text',
      },
      {
        x: 40,
        y: 58,
        titleKey: 'anatomy.settings.pin3.title',
        textKey: 'anatomy.settings.pin3.text',
      },
      {
        x: 62,
        y: 33,
        titleKey: 'anatomy.settings.pin4.title',
        textKey: 'anatomy.settings.pin4.text',
      },
    ],
  },
};

const TAB_ORDER: TabKey[] = ['library', 'schedule', 'newtab', 'settings'];

export function Anatomy({ lang }: { lang?: SupportedLanguage } = {}) {
  const t = useT(lang);
  const [tab, setTab] = useState<TabKey>('library');
  const [pin, setPin] = useState(0);

  const data = ANA[tab];
  const active = data.pins[pin];

  const handleTab = (next: TabKey) => {
    setTab(next);
    setPin(0);
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (currentIndex + dir + TAB_ORDER.length) % TAB_ORDER.length;
    handleTab(TAB_ORDER[next]);
    const nextEl = document.getElementById(`ana-tab-${TAB_ORDER[next]}`);
    nextEl?.focus();
  };

  return (
    <section className="anatomy">
      <div className="ana-wrap">
        <div className="ana-tabs" role="tablist" aria-label={t('anatomy.aria.tablist')}>
          {TAB_ORDER.map((key, i) => (
            <button
              key={key}
              id={`ana-tab-${key}`}
              className={`ana-tab${tab === key ? ' on' : ''}`}
              onClick={() => handleTab(key)}
              onKeyDown={e => handleTabKeyDown(e, i)}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`ana-panel-${key}`}
              tabIndex={tab === key ? 0 : -1}
            >
              <span className="tn">{`0${i + 1}`}</span>
              {t(ANA[key].labelKey)}
            </button>
          ))}
        </div>
        <div
          className="ana-stage"
          role="tabpanel"
          id={`ana-panel-${tab}`}
          aria-labelledby={`ana-tab-${tab}`}
        >
          <div className="ana-screen">
            <img src={data.src} alt={t(data.labelKey)} decoding="async" />
            {data.pins.map((p, i) => (
              <button
                key={i}
                className={`ana-pin${i === pin ? ' active' : ''}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => setPin(i)}
                aria-label={t(p.titleKey)}
                aria-describedby={i === pin ? 'ana-note' : undefined}
                aria-pressed={i === pin}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <aside className="ana-detail">
            <div>
              <h4>{t(data.viewLabelKey)}</h4>
              <h3>{t(data.titleKey)}</h3>
            </div>
            <div className="ana-note" id="ana-note" aria-live="polite">
              <b>{`${t('anatomy.pin')} 0${pin + 1} · ${t(active.titleKey)}`}</b>
              {t(active.textKey)}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
