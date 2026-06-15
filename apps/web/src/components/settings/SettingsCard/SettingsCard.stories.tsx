import type { Meta, StoryObj } from '@storybook/react-vite';
import { Settings } from 'lucide-react';
import { SettingsCard } from './';

const meta = {
  title: 'settings/SettingsCard',
  component: SettingsCard,
} satisfies Meta<typeof SettingsCard>;

export default meta;

type Story = StoryObj<typeof SettingsCard>;

export const Default: Story = {
  args: {
    icon: Settings,
    title: 'General',
    subtitle: 'Tweak how the app behaves',
    children: <p className="text-[13px] text-muted-foreground">Card body content goes here.</p>,
  },
};

export const Headerless: Story = {
  args: {
    children: <p className="text-[13px] text-muted-foreground">A card without a header.</p>,
  },
};

export const Danger: Story = {
  args: {
    icon: Settings,
    tone: 'destructive',
    title: 'Danger zone',
    subtitle: 'Irreversible actions live here',
  },
};
