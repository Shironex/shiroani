import { describe, it, expect } from 'vitest';
import { DEFAULT_DISCORD_TEMPLATES } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import { DiscordTemplateEditor } from '@/components/settings/DiscordTemplateEditor';

describe('DiscordTemplateEditor', () => {
  it('renders the editor title heading', () => {
    render(
      <DiscordTemplateEditor
        selectedActivity="watching"
        currentTemplate={DEFAULT_DISCORD_TEMPLATES.watching}
        onActivityChange={() => {}}
        onTemplateChange={() => {}}
        onReset={() => {}}
      />
    );
    // The SettingsCard renders the resolved editor title as a heading.
    expect(screen.getByRole('heading', { level: 3 })).toBeTruthy();
  });
});
