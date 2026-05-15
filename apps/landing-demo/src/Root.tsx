import { Composition } from 'remotion';
import { DemoReel, FPS, TOTAL_FRAMES, VIDEO_HEIGHT, VIDEO_WIDTH } from './DemoReel';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="DemoReelEn"
        component={DemoReel}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: 'en' as const }}
      />
      <Composition
        id="DemoReelPl"
        component={DemoReel}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: 'pl' as const }}
      />
    </>
  );
};
