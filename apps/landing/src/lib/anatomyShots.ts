import { getImage } from 'astro:assets';
import libraryView from '../assets/library_view.webp';
import scheduleView from '../assets/schedule_view.webp';
import onboarding from '../assets/onboarding.webp';
import screenshotSettings from '../assets/screenshot_settings.webp';
import type { AnatomyShots } from '../components/Anatomy';

// React can't run astro:assets' <Image>, so the responsive srcsets for the
// Anatomy island are generated here (Astro context) and passed down as a prop.
// The source modules are the SAME imports the component's ANA table uses, so
// Vite content-dedup resolves the base `src` to the identical canonical URL on
// both sides — keeping the SSR <img> and the hydrated React state in lockstep.
const SOURCES = {
  library: libraryView,
  schedule: scheduleView,
  newtab: onboarding,
  settings: screenshotSettings,
} as const;

const WIDTHS = [480, 800, 1400];

export async function anatomyShots(): Promise<AnatomyShots> {
  const entries = await Promise.all(
    Object.entries(SOURCES).map(async ([key, asset]) => {
      const generated = await getImage({ src: asset, widths: WIDTHS, format: 'webp' });
      return [
        key,
        {
          src: generated.src,
          srcSet: generated.srcSet.attribute || undefined,
          width: asset.width,
          height: asset.height,
        },
      ] as const;
    })
  );
  return Object.fromEntries(entries);
}
