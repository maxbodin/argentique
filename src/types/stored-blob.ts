/**
 * The subset of a Vercel Blob listing entry the app needs (kept small so the cached listing stays light).
 */
export type StoredBlob = {
  pathname: string;
  url: string;
  size: number;
  etag: string;
};
