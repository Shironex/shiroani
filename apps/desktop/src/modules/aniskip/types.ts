export interface AniSkipInterval {
  startTime: number;
  endTime: number;
}

export type AniSkipType = 'op' | 'ed' | 'mixed-op' | 'mixed-ed' | 'recap';

export interface AniSkipResult {
  interval: AniSkipInterval;
  skipType: AniSkipType;
  skipId: string;
  episodeLength: number;
}

export interface AniSkipResponse {
  found: boolean;
  results: AniSkipResult[];
  message: string;
  statusCode: number;
}
