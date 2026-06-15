import type { IChannelButtonView } from './ChannelButton.types';

/**
 * The channel toggle is presentational. The factory exists to satisfy the
 * component-folder convention and exposes no view-model.
 */
export function useChannelButton(): IChannelButtonView {
  return {};
}
