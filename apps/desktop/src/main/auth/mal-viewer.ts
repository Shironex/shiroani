import { z } from 'zod';
import { MAL_API_BASE } from '@shiroani/shared';
import type { MalViewer } from '@shiroani/shared';

/**
 * MAL user object (GET /users/@me): `{ id, name, picture, ... }`. `id` is
 * coerced because the boundary is an external API — accept a numeric string
 * rather than failing the connect flow on a representational quirk.
 */
const malViewerResponseSchema = z.object({
  id: z.coerce.number().finite(),
  name: z.string().min(1),
  picture: z.string().optional(),
});

/**
 * Fetch the authenticated MAL user (the connected account) with a FRESH access
 * token, for the connect flow's status snapshot. Kept as a small standalone,
 * mockable function rather than a full MAL client — that client belongs to a
 * later wave; auth only needs id + name + avatar.
 *
 * We map `picture` → {@link MalViewer.avatar}. The token is sent as a Bearer
 * header and is NEVER logged.
 */
export async function fetchMalViewer(accessToken: string): Promise<MalViewer> {
  const response = await fetch(`${MAL_API_BASE}/users/@me?fields=picture`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`MAL viewer request failed with status ${response.status}`);
  }

  const parsed = malViewerResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('MAL API returned invalid viewer data');
  }

  return {
    id: parsed.data.id,
    name: parsed.data.name,
    avatar: parsed.data.picture || undefined,
  };
}
