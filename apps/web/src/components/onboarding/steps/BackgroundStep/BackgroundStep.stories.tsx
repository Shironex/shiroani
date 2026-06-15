import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn } from 'storybook/test';
import { useBackgroundStore } from '@/stores/useBackgroundStore';
import { withFullHeight } from '../../../../../.storybook/decorators';
import BackgroundStep from './BackgroundStep';

const pickBackground = fn();
const removeBackground = fn();

const DEMO_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="%23b07ab0"/></svg>';

/**
 * Onboarding step 04 · App background. Wraps the shared BackgroundPanel
 * (`onboarding` variant): a 16:9 preview, a pick/reset action bar and the
 * blur/opacity/dim sliders. The panel owns the BackgroundStore wiring; stories
 * seed that store (with `fn()` for the file-dialog actions) so the step renders
 * deterministically without the Electron file dialog.
 */
const meta = {
  title: 'onboarding/steps/BackgroundStep',
  component: BackgroundStep,
  parameters: {
    layout: 'fullscreen',
    // Each slider is passed an aria-label via OnboardingSliderRow, which the
    // shared Slider forwards to its role="slider" thumb — axe passes clean.
    a11y: { test: 'error' },
  },
  decorators: [withFullHeight],
  beforeEach: () => {
    useBackgroundStore.setState({
      customBackground: null,
      customBackgroundFileName: null,
      backgroundOpacity: 0.6,
      backgroundBlur: 4,
      backgroundDim: 0.5,
      pickBackground,
      removeBackground,
    });
  },
} satisfies Meta<typeof BackgroundStep>;

export default meta;

type Story = StoryObj<typeof BackgroundStep>;

/** Empty — sliders disabled until an image is picked. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'App background' })).toBeInTheDocument();
    // Pick delegates to the store action.
    await userEvent.click(canvas.getByRole('button', { name: 'Pick image' }));
    await expect(pickBackground).toHaveBeenCalled();
  },
};

/**
 * With a custom image set the sliders enable; nudging the blur slider with the
 * keyboard writes through the store.
 */
export const WithBackground: Story = {
  beforeEach: () => {
    useBackgroundStore.setState({
      customBackground: DEMO_IMAGE,
      customBackgroundFileName: 'art.svg',
    });
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const blur = canvas.getByRole('slider', { name: 'Blur' });
    await expect(blur).not.toHaveAttribute('data-disabled');
    blur.focus();
    await userEvent.keyboard('{ArrowRight}');
    // The named slider drives setBackgroundBlur on the store.
    await expect(useBackgroundStore.getState().backgroundBlur).toBeGreaterThan(4);
  },
};
