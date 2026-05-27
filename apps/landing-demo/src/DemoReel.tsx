import { loadFont } from '@remotion/google-fonts/Inter';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Ensure Inter is available in headless Chromium, which ships no system fonts.
const { fontFamily: interFamily } = loadFont('normal', { weights: ['500', '600', '700'] });

export const FPS = 30;
// 4:3 instead of 16:9 — the source screenshots are ~5:4 (1122×900), so a
// widescreen frame leaves huge dead gutters on each side and shrinks the
// actual UI to a postcard. 4:3 puts the screenshot card comfortably in
// frame with breathing room for the caption above and dock dots below.
export const VIDEO_WIDTH = 1440;
export const VIDEO_HEIGHT = 1080;

const SCENE_FRAMES = 75; // 2.5s per scene
const SCENE_OVERLAP = 12; // cross-fade overlap
const INTRO_FRAMES = 60;
const OUTRO_FRAMES = 75;

type Lang = 'en' | 'pl';

interface SceneCopy {
  view: string;
  eyebrowEn: string;
  eyebrowPl: string;
  titleEn: string;
  titlePl: string;
}

const SCENES: SceneCopy[] = [
  {
    view: 'library',
    eyebrowEn: '01 · Library',
    eyebrowPl: '01 · Biblioteka',
    titleEn: 'Your anime, one cozy shelf.',
    titlePl: 'Twoje anime, jedna przytulna półka.',
  },
  {
    view: 'schedule',
    eyebrowEn: '02 · Schedule',
    eyebrowPl: '02 · Harmonogram',
    titleEn: 'Never miss an airing day.',
    titlePl: 'Nigdy nie przegap odcinka.',
  },
  {
    view: 'discover',
    eyebrowEn: '03 · Discover',
    eyebrowPl: '03 · Odkrywaj',
    titleEn: 'Roulette and genre browsing.',
    titlePl: 'Losowanie i przegląd po gatunkach.',
  },
  {
    view: 'browser',
    eyebrowEn: '04 · Browser',
    eyebrowPl: '04 · Przeglądarka',
    titleEn: 'Built-in, ad-free browser.',
    titlePl: 'Wbudowana, bez reklam.',
  },
  {
    view: 'feed',
    eyebrowEn: '05 · News',
    eyebrowPl: '05 · Aktualności',
    titleEn: 'Anime news, EN + PL.',
    titlePl: 'Anime newsy, PL + EN.',
  },
  {
    view: 'diary',
    eyebrowEn: '06 · Diary',
    eyebrowPl: '06 · Pamiętnik',
    titleEn: 'A quiet place for your thoughts.',
    titlePl: 'Ciche miejsce na Twoje myśli.',
  },
  {
    view: 'profile',
    eyebrowEn: '07 · Profile',
    eyebrowPl: '07 · Profil',
    titleEn: 'Your AniList, at a glance.',
    titlePl: 'Twój AniList na pierwszy rzut oka.',
  },
  {
    view: 'settings',
    eyebrowEn: '08 · Settings',
    eyebrowPl: '08 · Ustawienia',
    titleEn: '17 themes. Make it yours.',
    titlePl: '17 motywów. Zrób ją swoją.',
  },
];

export const TOTAL_FRAMES =
  INTRO_FRAMES + SCENES.length * (SCENE_FRAMES - SCENE_OVERLAP) + SCENE_OVERLAP + OUTRO_FRAMES;

const FONT_STACK = `${interFamily},"Segoe UI","SF Pro Display",system-ui,-apple-system,Roboto,sans-serif`;

const Background: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(80% 60% at 22% 28%, rgba(255,150,210,0.18), rgba(0,0,0,0) 60%),' +
          'radial-gradient(60% 50% at 80% 75%, rgba(150,170,255,0.18), rgba(0,0,0,0) 60%),' +
          'linear-gradient(180deg, #0d0710 0%, #1a0d1f 55%, #0d0710 100%)',
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(80% 60% at 50% 50%, black 30%, transparent 75%)',
        }}
      />
    </AbsoluteFill>
  );
};

interface WindowCardProps {
  src: string;
  scaleAt: number;
  translateY: number;
  opacity: number;
}

// Screenshots already include the app's own titlebar (the Electron chrome),
// so we don't wrap them in a second macOS-style frame — instead we just
// present them as a rounded, glowing card so two chrome bars don't fight.
// 1122x900 source aspect ≈ 1.247, scaled to fit comfortably with a
// caption above and a dock indicator below.
const CARD_W = 1100;
const CARD_H = Math.round(CARD_W / (1122 / 900)); // ≈ 882, leaves ~24px clearance above the dock

const WindowCard: React.FC<WindowCardProps> = ({ src, scaleAt, translateY, opacity }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 108,
        opacity,
      }}
    >
      <div
        style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 18,
          overflow: 'hidden',
          background: '#0d0710',
          boxShadow:
            '0 50px 110px rgba(0,0,0,0.55),' +
            '0 0 0 1px rgba(255,255,255,0.05),' +
            '0 0 80px rgba(255,126,182,0.12)',
          transform: `translateY(${translateY}px) scale(${scaleAt})`,
          transformOrigin: 'center center',
        }}
      >
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

interface CaptionProps {
  eyebrow: string;
  title: string;
  progress: number; // 0..1 for slide-in
}

const Caption: React.FC<CaptionProps> = ({ eyebrow, title, progress }) => {
  const slide = interpolate(progress, [0, 1], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 22,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          opacity: progress,
          transform: `translateY(${-slide}px)`,
          fontFamily: FONT_STACK,
        }}
      >
        <span
          style={{
            fontSize: 14,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: 'rgba(255,180,220,0.9)',
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,180,220,0.22)',
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.96)',
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
            letterSpacing: -0.2,
          }}
        >
          {title}
        </span>
      </div>
    </AbsoluteFill>
  );
};

interface SceneProps {
  scene: SceneCopy;
  lang: Lang;
}

const Scene: React.FC<SceneProps> = ({ scene, lang }) => {
  const frame = useCurrentFrame();
  const src = staticFile(`screenshots/${lang}/${scene.view}.png`);

  const opacity = interpolate(
    frame,
    [0, SCENE_OVERLAP, SCENE_FRAMES - SCENE_OVERLAP, SCENE_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const scale = interpolate(frame, [0, SCENE_FRAMES], [1.04, 1.08], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [0, SCENE_OVERLAP], [16, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const captionProgress = interpolate(
    frame,
    [SCENE_OVERLAP - 4, SCENE_OVERLAP + 12, SCENE_FRAMES - SCENE_OVERLAP, SCENE_FRAMES - 4],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill>
      <WindowCard src={src} scaleAt={scale} translateY={translateY} opacity={opacity} />
      <Caption
        eyebrow={lang === 'en' ? scene.eyebrowEn : scene.eyebrowPl}
        title={lang === 'en' ? scene.titleEn : scene.titlePl}
        progress={captionProgress * opacity}
      />
    </AbsoluteFill>
  );
};

interface TitleCardProps {
  lang: Lang;
  variant: 'intro' | 'outro';
}

const TitleCard: React.FC<TitleCardProps> = ({ lang, variant }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dur = durationInFrames;

  const opacity = interpolate(
    frame,
    variant === 'intro' ? [0, 15, dur - 15, dur] : [0, 15, dur - 8, dur],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const scale = interpolate(frame, [0, dur], [0.96, 1.02], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const title = '白アニ · ShiroAni';
  const subtitle =
    variant === 'intro'
      ? lang === 'en'
        ? 'Your cozy little corner for all things anime.'
        : 'Twój przytulny kącik dla wszystkiego, co anime.'
      : lang === 'en'
        ? 'Download free for Windows & macOS.'
        : 'Pobierz za darmo na Windows i macOS.';

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          transform: `scale(${scale})`,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 22,
            letterSpacing: 8,
            textTransform: 'uppercase',
            color: 'rgba(255,180,220,0.85)',
          }}
        >
          {variant === 'intro'
            ? lang === 'en'
              ? 'A quick tour'
              : 'Krótki spacer'
            : lang === 'en'
              ? 'Ready when you are'
              : 'Czeka na Ciebie'}
        </span>
        <h1
          style={{
            margin: 0,
            fontSize: 108,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: -1,
            textShadow: '0 12px 60px rgba(255,150,210,0.25)',
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 30,
            color: 'rgba(255,255,255,0.7)',
            maxWidth: 1100,
          }}
        >
          {subtitle}
        </p>
        {variant === 'outro' && (
          <div
            style={{
              marginTop: 30,
              padding: '16px 28px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, #ff7eb6 0%, #b794ff 100%)',
              color: '#1a0d1f',
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 0.3,
              boxShadow: '0 20px 60px rgba(255,126,182,0.35)',
            }}
          >
            shiroani.app
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

interface DockProps {
  activeIndex: number;
}

const Dock: React.FC<DockProps> = ({ activeIndex }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 36,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 999,
          background: 'rgba(20,12,28,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(6px)',
        }}
      >
        {SCENES.map((_, i) => {
          const active = i === activeIndex;
          return (
            <span
              key={i}
              style={{
                width: active ? 28 : 10,
                height: 10,
                borderRadius: 999,
                background: active ? '#ff7eb6' : 'rgba(255,255,255,0.2)',
                transition: 'none',
              }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ScenesWithDock: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  // Determine which scene is currently center stage.
  let activeIndex = 0;
  let cursor = 0;
  for (let i = 0; i < SCENES.length; i++) {
    const start = cursor;
    const end = cursor + SCENE_FRAMES;
    if (frame >= start + SCENE_OVERLAP / 2 && frame < end - SCENE_OVERLAP / 2) {
      activeIndex = i;
      break;
    }
    cursor += SCENE_FRAMES - SCENE_OVERLAP;
  }

  return (
    <AbsoluteFill>
      {SCENES.map((scene, i) => {
        const from = i * (SCENE_FRAMES - SCENE_OVERLAP);
        return (
          <Sequence key={scene.view} from={from} durationInFrames={SCENE_FRAMES} layout="none">
            <Scene scene={scene} lang={lang} />
          </Sequence>
        );
      })}
      <Dock activeIndex={activeIndex} />
    </AbsoluteFill>
  );
};

export type DemoReelProps = {
  lang: Lang;
};

export const DemoReel: React.FC<DemoReelProps> = ({ lang }) => {
  const scenesDuration = SCENES.length * (SCENE_FRAMES - SCENE_OVERLAP) + SCENE_OVERLAP;
  return (
    <AbsoluteFill>
      <Background />
      <Sequence durationInFrames={INTRO_FRAMES} layout="none">
        <TitleCard lang={lang} variant="intro" />
      </Sequence>
      <Sequence from={INTRO_FRAMES} durationInFrames={scenesDuration} layout="none">
        <ScenesWithDock lang={lang} />
      </Sequence>
      <Sequence from={INTRO_FRAMES + scenesDuration} durationInFrames={OUTRO_FRAMES} layout="none">
        <TitleCard lang={lang} variant="outro" />
      </Sequence>
    </AbsoluteFill>
  );
};
