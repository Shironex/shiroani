/**
 * Pure decorative SVG fragments + loading dots for FeedLoadingAnimation.
 * Extracted so the component shell stays free of in-JSX `.map`/arithmetic.
 *
 * Every fragment accepts `reducedMotion`: when set, the SMIL loops
 * (`<animate>`) are dropped in favour of a static composition, since the global
 * CSS `prefers-reduced-motion` rule cannot reach SMIL animations.
 */

const WAVE_INDEXES = [0, 1, 2];

const SPARKLES = [
  { cx: 155, cy: 35, delay: '0s' },
  { cx: 35, cy: 85, delay: '1.5s' },
  { cx: 165, cy: 85, delay: '0.8s' },
  { cx: 60, cy: 35, delay: '2.1s' },
];

const DOT_INDEXES = [0, 1, 2];

interface IMotionProps {
  reducedMotion?: boolean;
}

/** Signal waves expanding outward from center. */
export function SignalWaves({ reducedMotion }: IMotionProps) {
  if (reducedMotion) {
    // A single static ring stands in for the expanding pulse.
    return (
      <circle
        cx="100"
        cy="110"
        r="52"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        opacity="0.18"
      />
    );
  }

  return (
    <>
      {WAVE_INDEXES.map(i => (
        <circle
          key={`wave-${i}`}
          cx="100"
          cy="110"
          r="20"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          opacity="0"
        >
          <animate
            attributeName="r"
            from="20"
            to="80"
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.75;0.32;0"
            dur="2.4s"
            begin={`${i * 0.8}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </>
  );
}

/** Twinkling sparkles scattered around the icon. */
export function Sparkles({ reducedMotion }: IMotionProps) {
  return (
    <>
      {SPARKLES.map((s, i) => (
        <circle
          key={`sparkle-${i}`}
          cx={s.cx}
          cy={s.cy}
          r="1.8"
          fill="var(--primary)"
          opacity={reducedMotion ? 0.5 : undefined}
        >
          {!reducedMotion && (
            <>
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur="2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
              <animate
                attributeName="r"
                values="0.8;2.4;0.8"
                dur="2s"
                begin={s.delay}
                repeatCount="indefinite"
              />
            </>
          )}
        </circle>
      ))}
    </>
  );
}

/** Three pulsing dots after the loading label. */
export function LoadingDots({ reducedMotion }: IMotionProps) {
  return (
    <span className="inline-flex w-6">
      {DOT_INDEXES.map(i => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"
          style={
            reducedMotion
              ? undefined
              : {
                  animation: 'feed-dot 1.4s infinite',
                  animationDelay: `${i * 0.2}s`,
                }
          }
        />
      ))}
    </span>
  );
}
