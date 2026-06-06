import { MAL_API_BASE } from '@shiroani/shared';
import type { MalViewer } from '@shiroani/shared';

/**
 * Fetch the authenticated MAL user (the connected account) with a FRESH access
 * token, for the connect flow's status snapshot. Kept as a small standalone,
 * mockable function rather than a full MAL client — that client belongs to a
 * later wave; auth only needs id + name + avatar.
 *
 * MAL user object: `{ id, name, picture, ... }` (GET /users/@me). We map
 * `picture` → {@link MalViewer.avatar}. The token is sent as a Bearer header and
 * is NEVER logged.
 */
export async function fetchMalViewer(accessToken: string): Promise<MalViewer> {
  const response = await fetch(`${MAL_API_BASE}/users/@me?fields=picture`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`MAL viewer request failed with status ${response.status}`);
  }

  const body = (await response.json()) as {
    id?: unknown;
    name?: unknown;
    picture?: unknown;
  } | null;
  if (!body || typeof body !== 'object') {
    throw new Error('MAL API returned invalid viewer data');
  }
  const id = typeof body.id === 'number' ? body.id : Number(body.id);
  const name = typeof body.name === 'string' ? body.name : '';
  if (!Number.isFinite(id) || !name) {
    throw new Error('MAL API returned no viewer data');
  }

  return {
    id,
    name,
    avatar: typeof body.picture === 'string' && body.picture ? body.picture : undefined,
  };
}
