import { describe, it, expect } from 'vitest';
import type { BrowserLeafNode, BrowserNode } from '@shiroani/shared';
import { tabAudioState } from '../browserTree';

function leaf(id: string, audio: Partial<BrowserLeafNode> = {}): BrowserLeafNode {
  return {
    kind: 'leaf',
    id,
    url: `https://${id}.example`,
    title: id,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    ...audio,
  };
}

function split(left: BrowserNode, right: BrowserNode): BrowserNode {
  return {
    kind: 'split',
    id: `${left.id}+${right.id}`,
    orientation: 'horizontal',
    ratio: 0.5,
    left,
    right,
  };
}

describe('tabAudioState', () => {
  it('is null for a silent, unmuted tab', () => {
    expect(tabAudioState(leaf('a'))).toBeNull();
  });

  it('is audible when a pane plays sound', () => {
    expect(tabAudioState(leaf('a', { isAudible: true }))).toBe('audible');
  });

  it('is muted when a pane is muted, even while it plays sound', () => {
    expect(tabAudioState(leaf('a', { isMuted: true }))).toBe('muted');
    expect(tabAudioState(leaf('a', { isMuted: true, isAudible: true }))).toBe('muted');
  });

  it('looks at every pane of a nested split', () => {
    const tab = split(leaf('a'), split(leaf('b'), leaf('c', { isAudible: true })));
    expect(tabAudioState(tab)).toBe('audible');
  });

  it('prefers an audible unmuted pane over a muted sibling', () => {
    const tab = split(leaf('a', { isMuted: true }), leaf('b', { isAudible: true }));
    expect(tabAudioState(tab)).toBe('audible');
  });

  it('shows muted for a split where the only sound comes from muted panes', () => {
    const tab = split(leaf('a', { isMuted: true, isAudible: true }), leaf('b'));
    expect(tabAudioState(tab)).toBe('muted');
  });
});
