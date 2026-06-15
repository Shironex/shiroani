import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, userEvent, expect, fn, waitFor } from 'storybook/test';
import { Info, Settings } from 'lucide-react';
import { SettingsCard, SettingsInfoCallout, SettingsSelectRow, SettingsToggleRow } from './';

/**
 * The shared shell for every settings section: a tinted, glassy card with an
 * optional icon + title + subtitle header and a body of row primitives. The
 * colocated primitives — `SettingsToggleRow` (label + `Switch`),
 * `SettingsSelectRow` (label + Radix `Select`) and `SettingsInfoCallout` —
 * keep the aria wiring (a switch/trigger labelled by its row title) consistent
 * across the whole settings surface.
 */
const meta = {
  title: 'settings/SettingsCard',
  component: SettingsCard,
  argTypes: {
    title: { control: 'text', description: 'Title shown in the header.' },
    subtitle: { control: 'text', description: 'Subtitle shown below the title.' },
    tone: {
      control: 'select',
      options: ['primary', 'green', 'gold', 'blue', 'orange', 'muted', 'destructive'],
      description: 'Tint for the icon tile (and the whole card when destructive).',
    },
  },
  parameters: {
    // The card header, switch (labelled by its row title) and select trigger all
    // carry accessible names, so axe passes clean.
    a11y: { test: 'error' },
  },
} satisfies Meta<typeof SettingsCard>;

export default meta;

type Story = StoryObj<typeof SettingsCard>;

/** Header with icon, title, subtitle + a body. */
export const Default: Story = {
  args: {
    icon: Settings,
    title: 'General',
    subtitle: 'Tweak how the app behaves',
    children: <p className="text-[13px] text-muted-foreground">Card body content goes here.</p>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'General' })).toBeInTheDocument();
    await expect(canvas.getByText('Tweak how the app behaves')).toBeInTheDocument();
  },
};

/** Body-only card — no header. */
export const Headerless: Story = {
  args: {
    children: <p className="text-[13px] text-muted-foreground">A card without a header.</p>,
  },
};

/** Destructive tone — the whole container is tinted. */
export const Danger: Story = {
  args: {
    icon: Settings,
    tone: 'destructive',
    title: 'Danger zone',
    subtitle: 'Irreversible actions live here',
  },
};

/** Toggling the switch fires `onCheckedChange` with the new value. */
export const ToggleRow: Story = {
  args: {
    icon: Settings,
    title: 'Behavior',
    children: (
      <SettingsToggleRow
        title="Dark mode"
        description="Use the dark colour scheme"
        checked={false}
        onCheckedChange={fn()}
      />
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const sw = canvas.getByRole('switch', { name: 'Dark mode' });
    await expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    const onCheckedChange = (args.children as { props: { onCheckedChange: ReturnType<typeof fn> } })
      .props.onCheckedChange;
    await expect(onCheckedChange).toHaveBeenCalledWith(true);
  },
};

/** Opening the select and picking an option fires `onValueChange`. */
export const SelectRow: Story = {
  args: {
    icon: Settings,
    title: 'Localisation',
    children: (
      <SettingsSelectRow
        title="Language"
        value="pl"
        onValueChange={fn()}
        options={[
          { value: 'pl', label: 'Polski' },
          { value: 'en', label: 'English' },
        ]}
      />
    ),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox', { name: 'Language' });
    await expect(trigger).toHaveTextContent('Polski');
    await userEvent.click(trigger);
    // Radix Select content portals to document.body.
    const body = within(canvasElement.ownerDocument.body);
    const option = await body.findByRole('option', { name: 'English' });
    await userEvent.click(option);
    const onValueChange = (args.children as { props: { onValueChange: ReturnType<typeof fn> } })
      .props.onValueChange;
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith('en'));
    // Picking an option closes the listbox, so no portalled overlay is left
    // behind when the post-play a11y check runs.
    await waitFor(() => expect(body.queryByRole('option')).not.toBeInTheDocument());
  },
};

/** The tinted info callout renders its children. */
export const InfoCallout: Story = {
  args: {
    icon: Settings,
    title: 'Notes',
    children: (
      <SettingsInfoCallout icon={Info} iconClassName="w-4 h-4 text-primary shrink-0">
        A restart is required for this change to take effect.
      </SettingsInfoCallout>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText('A restart is required for this change to take effect.')
    ).toBeInTheDocument();
  },
};
