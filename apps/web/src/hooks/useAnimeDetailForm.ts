import { useState, useEffect } from 'react';
import type { AnimeEntry, AnimeStatus } from '@shiroani/shared';

export function useAnimeDetailForm(entry: AnimeEntry | null) {
  const [status, setStatus] = useState<AnimeStatus>('watching');
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [score, setScore] = useState(0);
  const [notes, setNotes] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [anilistId, setAnilistId] = useState<string>('');

  // Seed the form from the entry only when a DIFFERENT entry is opened.
  // Depending on `entry?.id` alone is intentional: re-running this on any
  // field change (e.g. an optimistic store update for the same entry) would
  // overwrite the user's in-progress edits. The form owns its state once a
  // given entry is loaded; switching to another entry (new id) re-seeds it.
  useEffect(() => {
    if (entry) {
      setStatus(entry.status);
      setCurrentEpisode(entry.currentEpisode);
      setScore(entry.score ?? 0);
      setNotes(entry.notes ?? '');
      setResumeUrl(entry.resumeUrl ?? '');
      setAnilistId(entry.anilistId ? String(entry.anilistId) : '');
    }
  }, [entry?.id]);

  // Auto-set current episode to total when status is completed
  useEffect(() => {
    if (status === 'completed' && entry?.episodes && entry.episodes > 0) {
      setCurrentEpisode(entry.episodes);
    }
  }, [status, entry?.episodes]);

  return {
    status,
    setStatus,
    currentEpisode,
    setCurrentEpisode,
    score,
    setScore,
    notes,
    setNotes,
    resumeUrl,
    setResumeUrl,
    anilistId,
    setAnilistId,
  };
}
