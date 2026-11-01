/**
 * A gallery photo, as rendered.
 */
export type Photo = {
  src: string;
  width: number;
  height: number;
  /**
   * Bytes of the 750px resized copy most phones load. Used to put lighter photos first, so the first screen fills sooner without touching image quality.
   * UNKNOWN_WEIGHT (see `@/lib/data`) until the photo's metadata has been computed.
   */
  weight: number;
  /** Tiny inline WebP shown while the photo loads (absent until metadata is computed). */
  placeholder?: string;
};
