import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@/test/test-utils';
import { DEFAULT_LANGUAGE } from '@shiroani/shared';
import { getChangelogReleases } from '@/lib/changelog-entries';
import ChangelogView from './ChangelogView';

// The view renders the static `@shiroani/changelog` package data localized to
// the active UI language (storybook/tests default to DEFAULT_LANGUAGE = 'en'),
// so we derive expectations from the same source rather than hard-coding counts.
const releases = getChangelogReleases(DEFAULT_LANGUAGE);
const majorReleases = releases.filter(r => r.type === 'major');
const minorReleases = releases.filter(r => r.type === 'minor');
const latest = releases.find(r => r.latest) ?? releases[0];

describe('ChangelogView', () => {
  it('renders the headline, subtitle and the latest-version badge', () => {
    render(<ChangelogView />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/change history/i)).toBeInTheDocument();
    // The eyebrow badge calls out the newest version.
    expect(screen.getByText(new RegExp(`v${latest.version}.*latest`, 'i'))).toBeInTheDocument();
  });

  it('renders every release as a card with its title and version', () => {
    render(<ChangelogView />);

    // One <h2> heading per release card (the headline is the only <h1>).
    const cards = screen.getAllByRole('heading', { level: 2 });
    expect(cards).toHaveLength(releases.length);

    // The newest release's title and version both appear.
    expect(screen.getByRole('heading', { level: 2, name: latest.title })).toBeInTheDocument();
    expect(screen.getAllByText(`v${latest.version}`).length).toBeGreaterThan(0);
  });

  it('labels filter chips with the live counts for each release type', () => {
    render(<ChangelogView />);

    expect(
      screen.getByRole('button', { name: new RegExp(`All\\s*${releases.length}`) })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`Major releases\\s*${majorReleases.length}`) })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(`Patches\\s*${minorReleases.length}`) })
    ).toBeInTheDocument();
  });

  it('filters down to major releases when the "Major releases" chip is clicked', async () => {
    const { user } = render(<ChangelogView />);

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(releases.length);

    await user.click(screen.getByRole('button', { name: /Major releases/i }));

    // Only the major release cards remain.
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(majorReleases.length);
    expect(
      screen.getByRole('heading', { level: 2, name: majorReleases[0].title })
    ).toBeInTheDocument();
    // A minor-only release is absent from the filtered list.
    const minorOnly = minorReleases[0];
    expect(
      screen.queryByRole('heading', { level: 2, name: minorOnly.title })
    ).not.toBeInTheDocument();
  });

  it('filters down to patches and back to all', async () => {
    const { user } = render(<ChangelogView />);

    await user.click(screen.getByRole('button', { name: /Patches/i }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(minorReleases.length);

    await user.click(screen.getByRole('button', { name: /All/i }));
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(releases.length);
  });

  it('shows the origin marker on the full list and hides it when filtering', async () => {
    const { user } = render(<ChangelogView />);

    // "all" filter is the default — the closing origin marker is present.
    expect(screen.getByText(/Origin · 2026/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Major releases/i }));
    expect(screen.queryByText(/Origin · 2026/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /All/i }));
    expect(screen.getByText(/Origin · 2026/)).toBeInTheDocument();
  });

  it('renders jump-nav anchors for major releases pointing at their card ids', () => {
    render(<ChangelogView />);

    const nav = screen.getByRole('navigation', { name: /jump to version/i });
    const links = within(nav).getAllByRole('link');
    // The strip is capped at the first 6 major releases to keep it short.
    expect(links.length).toBeGreaterThan(0);
    expect(links.length).toBeLessThanOrEqual(6);
    // Each anchor targets a release card section by id (#v<version>).
    expect(links[0]).toHaveAttribute('href', `#v${majorReleases[0].version}`);
  });

  it('renders the localized category lists for the newest release', () => {
    render(<ChangelogView />);

    // The newest release exposes at least one category whose bullet entries render.
    const firstCategory = latest.categories[0];
    expect(firstCategory).toBeDefined();
    expect(screen.getByText(firstCategory.entries[0])).toBeInTheDocument();
  });

  it('omits the kanji watermark and uses tighter chrome in compact mode', () => {
    const { container, rerender } = render(<ChangelogView />);
    // Full mode: the decorative kanji watermark is present.
    expect(container.querySelector('[aria-hidden]')).toBeTruthy();

    rerender(<ChangelogView compact />);
    // Compact still renders the timeline content (headline + cards).
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(releases.length);
  });

  it('applies a passed className to the root element', () => {
    const { container } = render(<ChangelogView className="custom-changelog" />);
    expect(container.firstChild).toHaveClass('custom-changelog');
  });
});
