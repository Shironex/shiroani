import { useTranslation } from 'react-i18next';
import { useFeedLoadingAnimation } from './FeedLoadingAnimation.hooks';
import { LoadingDots, Sparkles, SignalWaves } from './FeedLoadingAnimation.parts';

/**
 * Delightful SVG loading animation with animated RSS signal waves,
 * floating news card silhouettes, and subtle sparkle effects.
 */
export default function FeedLoadingAnimation() {
  const { t } = useTranslation('feed');
  const { reducedMotion } = useFeedLoadingAnimation();

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 select-none">
      <div className="relative w-56 h-56">
        <div className="absolute inset-6 rounded-full bg-primary/12 blur-3xl" aria-hidden="true" />
        <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="feed-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.95" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.45" />
            </linearGradient>
            <linearGradient id="card-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Signal waves expanding outward from center */}
          <SignalWaves reducedMotion={reducedMotion} />

          {/* RSS Icon - dot */}
          <circle cx="82" cy="128" r="7" fill="url(#feed-grad)">
            {!reducedMotion && (
              <animate attributeName="r" values="7;8.2;7" dur="2s" repeatCount="indefinite" />
            )}
          </circle>

          {/* RSS Icon - inner arc */}
          <path
            d="M 78 108 A 26 26 0 0 1 104 134"
            fill="none"
            stroke="url(#feed-grad)"
            strokeWidth="5.5"
            strokeLinecap="round"
          >
            {!reducedMotion && (
              <animate
                attributeName="stroke-opacity"
                values="0.55;1;0.55"
                dur="2s"
                begin="0.3s"
                repeatCount="indefinite"
              />
            )}
          </path>

          {/* RSS Icon - outer arc */}
          <path
            d="M 78 90 A 44 44 0 0 1 122 134"
            fill="none"
            stroke="url(#feed-grad)"
            strokeWidth="5.5"
            strokeLinecap="round"
          >
            {!reducedMotion && (
              <animate
                attributeName="stroke-opacity"
                values="0.45;0.92;0.45"
                dur="2s"
                begin="0.6s"
                repeatCount="indefinite"
              />
            )}
          </path>

          {/* Floating card 1 - top right */}
          <g>
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 3,-8; 0,0"
                dur="4s"
                repeatCount="indefinite"
              />
            )}
            <rect
              x="138"
              y="42"
              width="36"
              height="26"
              rx="4"
              fill="url(#card-grad)"
              stroke="var(--primary)"
              strokeWidth="0.75"
              strokeOpacity="0.35"
            />
            <rect
              x="142"
              y="47"
              width="16"
              height="2"
              rx="1"
              fill="var(--primary)"
              fillOpacity="0.22"
            />
            <rect
              x="142"
              y="52"
              width="28"
              height="2"
              rx="1"
              fill="var(--primary)"
              fillOpacity="0.18"
            />
            <rect
              x="142"
              y="57"
              width="22"
              height="2"
              rx="1"
              fill="var(--primary)"
              fillOpacity="0.14"
            />
            {!reducedMotion && (
              <animate
                attributeName="opacity"
                values="0;0.92;0.92;0"
                dur="4s"
                repeatCount="indefinite"
              />
            )}
          </g>

          {/* Floating card 2 - top left */}
          <g>
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; -4,-6; 0,0"
                dur="5s"
                begin="1.2s"
                repeatCount="indefinite"
              />
            )}
            <rect
              x="22"
              y="50"
              width="40"
              height="28"
              rx="4"
              fill="url(#card-grad)"
              stroke="var(--primary)"
              strokeWidth="0.75"
              strokeOpacity="0.35"
            />
            <rect
              x="26"
              y="55"
              width="12"
              height="8"
              rx="2"
              fill="var(--primary)"
              fillOpacity="0.2"
            />
            <rect
              x="26"
              y="66"
              width="32"
              height="2"
              rx="1"
              fill="var(--primary)"
              fillOpacity="0.18"
            />
            <rect
              x="26"
              y="71"
              width="24"
              height="2"
              rx="1"
              fill="var(--primary)"
              fillOpacity="0.14"
            />
            {!reducedMotion && (
              <animate
                attributeName="opacity"
                values="0;0.84;0.84;0"
                dur="5s"
                begin="1.2s"
                repeatCount="indefinite"
              />
            )}
          </g>

          {/* Floating card 3 - right middle */}
          <g>
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 5,-10; 0,0"
                dur="4.5s"
                begin="0.6s"
                repeatCount="indefinite"
              />
            )}
            <rect
              x="148"
              y="110"
              width="32"
              height="24"
              rx="4"
              fill="url(#card-grad)"
              stroke="var(--primary)"
              strokeWidth="0.75"
              strokeOpacity="0.35"
            />
            <rect
              x="152"
              y="115"
              width="10"
              height="6"
              rx="1.5"
              fill="var(--primary)"
              fillOpacity="0.2"
            />
            <rect
              x="152"
              y="124"
              width="24"
              height="2"
              rx="1"
              fill="var(--primary)"
              fillOpacity="0.18"
            />
            <rect
              x="152"
              y="129"
              width="18"
              height="1.5"
              rx="0.75"
              fill="var(--primary)"
              fillOpacity="0.14"
            />
            {!reducedMotion && (
              <animate
                attributeName="opacity"
                values="0;0.8;0.8;0"
                dur="4.5s"
                begin="0.6s"
                repeatCount="indefinite"
              />
            )}
          </g>

          {/* Sparkles */}
          <Sparkles reducedMotion={reducedMotion} />
        </svg>
      </div>

      {/* Loading text with animated dots */}
      <div className="flex items-center gap-1.5 text-sm text-foreground/75">
        <span className="font-medium tracking-tight">{t('loading')}</span>
        <LoadingDots reducedMotion={reducedMotion} />
      </div>
    </div>
  );
}
