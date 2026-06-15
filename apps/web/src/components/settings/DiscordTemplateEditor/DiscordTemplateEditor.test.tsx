import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_DISCORD_TEMPLATES, type DiscordPresenceTemplate } from '@shiroani/shared';
import { render, screen } from '@/test/test-utils';
import i18n from '@/lib/i18n';
import type { IDiscordTemplateEditorProps } from '@/components/settings/DiscordTemplateEditor';
import { DiscordTemplateEditor } from '@/components/settings/DiscordTemplateEditor';

const WATCHING: DiscordPresenceTemplate = {
  details: 'Watching anime',
  state: '{anime_title}',
  showTimestamp: true,
  showLargeImage: true,
  showButton: true,
};

function renderEditor(overrides?: Partial<IDiscordTemplateEditorProps>) {
  const props: IDiscordTemplateEditorProps = {
    selectedActivity: 'watching',
    currentTemplate: WATCHING,
    onActivityChange: vi.fn(),
    onTemplateChange: vi.fn(),
    onReset: vi.fn(),
    ...overrides,
  };
  const utils = render(<DiscordTemplateEditor {...props} />);
  return { ...utils, props };
}

describe('DiscordTemplateEditor', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the editor title heading', () => {
    renderEditor();
    expect(screen.getByRole('heading', { name: 'Status templates' })).toBeInTheDocument();
  });

  it('reflects the current template line values in the inputs', () => {
    renderEditor();
    expect(screen.getByDisplayValue('Watching anime')).toBeInTheDocument();
    expect(screen.getByDisplayValue('{anime_title}')).toBeInTheDocument();
  });

  it('typing the line-1 input calls onTemplateChange for the details field', async () => {
    const onTemplateChange = vi.fn();
    const { user } = renderEditor({
      currentTemplate: { ...WATCHING, details: '' },
      onTemplateChange,
    });
    const line1 = screen.getByPlaceholderText('e.g. Watching anime');
    await user.type(line1, 'X');
    expect(onTemplateChange).toHaveBeenCalledWith('watching', 'details', 'X');
  });

  it('typing the line-2 input calls onTemplateChange for the state field', async () => {
    const onTemplateChange = vi.fn();
    const { user } = renderEditor({
      currentTemplate: { ...WATCHING, state: '' },
      onTemplateChange,
    });
    const line2 = screen.getByPlaceholderText('e.g. {anime_title}');
    await user.type(line2, 'Y');
    expect(onTemplateChange).toHaveBeenCalledWith('watching', 'state', 'Y');
  });

  it('reflects the toggle states from the current template', () => {
    renderEditor({
      currentTemplate: {
        ...WATCHING,
        showTimestamp: true,
        showLargeImage: false,
        showButton: true,
      },
    });
    expect(screen.getByRole('switch', { name: 'Duration' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Anime cover' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'AniList button' })).toBeChecked();
  });

  it('toggling a template switch calls onTemplateChange with the new boolean', async () => {
    const onTemplateChange = vi.fn();
    const { user } = renderEditor({
      currentTemplate: { ...WATCHING, showLargeImage: false },
      onTemplateChange,
    });
    await user.click(screen.getByRole('switch', { name: 'Anime cover' }));
    expect(onTemplateChange).toHaveBeenCalledWith('watching', 'showLargeImage', true);
  });

  it('reflects the selected activity on the combobox trigger', () => {
    renderEditor({
      selectedActivity: 'library',
      currentTemplate: DEFAULT_DISCORD_TEMPLATES.library,
    });
    expect(screen.getByRole('combobox')).toHaveTextContent('Library');
  });

  it('clicking Restore defaults calls onReset', async () => {
    const onReset = vi.fn();
    const { user } = renderEditor({ onReset });
    await user.click(screen.getByRole('button', { name: 'Restore defaults' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
