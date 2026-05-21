import type { BrowserLeafNode, BrowserNode, BrowserSplitNode, BrowserTab } from '@shiroani/shared';

/**
 * Pure tree algebra for the browser tab/split tree. Every function here is a
 * pure transformation of `BrowserNode` values — no Zustand, no React, no
 * persistence. The store composes these into its actions.
 */

/** First leaf encountered in a depth-first walk — used to seed activePaneId. */
export function firstLeaf(node: BrowserNode): BrowserLeafNode {
  return node.kind === 'leaf' ? node : firstLeaf(node.left);
}

/** Find a leaf with the given id anywhere in the tree, or null. */
export function findLeaf(node: BrowserNode, id: string): BrowserLeafNode | null {
  if (node.kind === 'leaf') return node.id === id ? node : null;
  return findLeaf(node.left, id) ?? findLeaf(node.right, id);
}

/** Walk a list of top-level tabs and return the leaf matching `id`, or null. */
export function findLeafById(tabs: BrowserNode[], id: string): BrowserLeafNode | null {
  for (const tab of tabs) {
    const leaf = findLeaf(tab, id);
    if (leaf) return leaf;
  }
  return null;
}

/** Find the top-level tab that contains the given pane id. */
export function findTabContainingPane(tabs: BrowserNode[], paneId: string): BrowserNode | null {
  for (const tab of tabs) {
    if (findLeaf(tab, paneId)) return tab;
  }
  return null;
}

/** Map every leaf in a node by paneId, replacing it with the result of `fn`. */
export function mapLeaves(
  node: BrowserNode,
  fn: (leaf: BrowserLeafNode) => BrowserLeafNode
): BrowserNode {
  if (node.kind === 'leaf') return fn(node);
  const left = mapLeaves(node.left, fn);
  const right = mapLeaves(node.right, fn);
  if (left === node.left && right === node.right) return node;
  return { ...node, left, right };
}

/** Rewrite a single leaf in a node, returning a structurally-shared tree. */
export function updateLeaf(
  node: BrowserNode,
  paneId: string,
  updates: Partial<BrowserTab>
): BrowserNode {
  return mapLeaves(node, leaf => (leaf.id === paneId ? { ...leaf, ...updates } : leaf));
}

/** Locate the parent split (if any) of a given child node id within `tabs`. */
export function findParentSplit(
  tabs: BrowserNode[],
  childId: string
): { parent: BrowserSplitNode; tabIndex: number } | null {
  function walk(
    node: BrowserNode,
    tabIndex: number
  ): { parent: BrowserSplitNode; tabIndex: number } | null {
    if (node.kind === 'leaf') return null;
    if (node.left.id === childId || node.right.id === childId) {
      return { parent: node, tabIndex };
    }
    return walk(node.left, tabIndex) ?? walk(node.right, tabIndex);
  }
  for (let i = 0; i < tabs.length; i++) {
    const found = walk(tabs[i], i);
    if (found) return found;
  }
  return null;
}

/** Replace a node anywhere in the tree by id. Returns the new root or `null` if not found. */
export function replaceNode(
  node: BrowserNode,
  targetId: string,
  replacement: BrowserNode
): BrowserNode | null {
  if (node.id === targetId) return replacement;
  if (node.kind === 'leaf') return null;
  const left = replaceNode(node.left, targetId, replacement);
  if (left) return { ...node, left };
  const right = replaceNode(node.right, targetId, replacement);
  if (right) return { ...node, right };
  return null;
}

/** Collect every leaf in a node (used by closeTab to unregister webviews). */
export function collectLeaves(node: BrowserNode): BrowserLeafNode[] {
  if (node.kind === 'leaf') return [node];
  return [...collectLeaves(node.left), ...collectLeaves(node.right)];
}

/**
 * Single-pass split-ratio update. Returns `null` when the split id is not in
 * this subtree (caller keeps searching), `{ kind: 'unchanged' }` when the
 * split was found but the ratio already matches (caller stops without a
 * state mutation), or `{ kind: 'updated', node }` with a structurally-shared
 * rewrite of the subtree.
 */
export type SplitRatioResult =
  | { kind: 'unchanged' }
  | { kind: 'updated'; node: BrowserNode }
  | null;

export function applySplitRatio(node: BrowserNode, id: string, ratio: number): SplitRatioResult {
  if (node.kind === 'leaf') return null;
  if (node.id === id) {
    if (node.ratio === ratio) return { kind: 'unchanged' };
    return { kind: 'updated', node: { ...node, ratio } };
  }
  const left = applySplitRatio(node.left, id, ratio);
  if (left) {
    if (left.kind === 'unchanged') return left;
    return { kind: 'updated', node: { ...node, left: left.node } };
  }
  const right = applySplitRatio(node.right, id, ratio);
  if (right) {
    if (right.kind === 'unchanged') return right;
    return { kind: 'updated', node: { ...node, right: right.node } };
  }
  return null;
}
