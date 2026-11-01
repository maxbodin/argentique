import { list } from "@vercel/blob";
import { getCache, waitUntil } from "@vercel/functions";
import { BLOB_READ_WRITE_TOKEN } from "astro:env/server";
import { IMAGE_QUALITY } from "@/lib/image-config";
import type { ImageSize } from "@/types/image-size";
import type { Photo } from "@/types/photo";
import type { PhotoMeta } from "@/types/photo-meta";
import type { StoredBlob } from "@/types/stored-blob";
import type { YearMonth } from "@/types/year-month";

export const UNKNOWN_WEIGHT = Number.MAX_SAFE_INTEGER;

/** Longest side, in pixels, of the inline placeholder. */
const PLACEHOLDER_SIZE = 8;

/** Typical phone request (≈400 CSS px at 1.75–2x DPR), one of OPTIMIZED_WIDTHS. */
const WEIGHT_PROBE_WIDTH = 750;

/** Used only if a photo's header can't be read; the real ratio replaces it on the next render. */
const FALLBACK_SIZE: ImageSize = { width: 1000, height: 1500 };

const BLOB_LIST_TTL = 3600;
const PHOTO_META_TTL = 365 * 24 * 3600;

/**
 * Vercel Runtime Cache: shared by every function in a region and kept across deployments. Outside Vercel (local dev) it falls back to an in-memory cache.
 */
const cache = getCache( { namespace: "argentique" } );

/** Cache keys of photos whose metadata is being computed by this instance (avoids duplicate work). */
const pendingMeta = new Set<string>();


/**
 * Reads a value from the Runtime Cache. Cache errors are treated as misses so rendering never depends on the cache being reachable.
 * @param key The cache key.
 * @returns The cached value, or null on a miss or error.
 */
async function readCache<T>( key: string ): Promise<T | null> {
  const hit = await cache.get( key ).catch( () => null );
  return hit === null || hit === undefined ? null : hit as T;
}


/**
 * Writes a value to the Runtime Cache, ignoring cache errors.
 * @param key The cache key.
 * @param value The value to store.
 * @param ttl Time to live, in seconds.
 * @returns Resolves once the write has been attempted.
 */
async function writeCache( key: string, value: unknown, ttl: number ): Promise<void> {
  await cache.set( key, value, { ttl } ).catch( () => undefined );
}


/**
 * Fetches and caches ALL blobs from Vercel Blob storage (following pagination).
 * The result of this function is cached for one hour.
 * @returns Every blob in the store.
 */
async function getAllBlobs(): Promise<StoredBlob[]> {
  const key = "all-blobs-v1";
  const hit = await readCache<StoredBlob[]>( key );
  if (hit) return hit;

  const blobs: StoredBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list( { cursor, token: BLOB_READ_WRITE_TOKEN } );
    for (const { pathname, url, size, etag } of page.blobs) {
      blobs.push( { pathname, url, size, etag } );
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  await writeCache( key, blobs, BLOB_LIST_TTL );
  return blobs;
}


/**
 * Gets unique gallery folder names sorted from most recent to oldest.
 * @returns The gallery folder names.
 */
export async function getGalleryFolders(): Promise<string[]> {
  const blobs = await getAllBlobs();

  const folders = new Set<string>();

  for (const { pathname } of blobs) {
    if (!pathname.endsWith( "/" )) continue;

    const folderName = pathname.split( "/", 1 )[0];

    folders.add( folderName );
  }

  return [...folders].sort( compareFoldersByDateDesc );
}


/**
 * Compares folder names using their YYYY MM prefix.
 * Sorts by year DESC, then month DESC.
 * @param a The first folder name.
 * @param b The second folder name.
 * @returns A negative number if `a` is more recent than `b`, positive if older, 0 if same month.
 */
function compareFoldersByDateDesc( a: string, b: string ): number {
  const dateA = extractYearMonth( a );
  const dateB = extractYearMonth( b );

  return dateB.year - dateA.year || dateB.month - dateA.month;
}


/**
 * Extracts year and month from folder name.
 * @param folder The folder name (`YYYY-MM-...`).
 * @returns The year and month.
 */
function extractYearMonth( folder: string ): YearMonth {
  const [year, month] = folder.split( "-", 2 );

  return {
    year: Number( year ),
    month: Number( month ),
  };
}


/**
 * Gets the photos of a gallery, with the dimensions needed to render them without layout shift. Never waits on downloading originals: photos whose metadata isn't cached yet are sized from their file header, and their placeholder/weight are computed after the response (ready for the next render).
 * @param slug The gallery folder to filter by.
 * @returns The gallery's photos, in storage order.
 */
export async function getGalleryPhotos( slug: string ): Promise<Photo[]> {
  const allBlobs = await getAllBlobs();

  const prefix = `${ slug }/`;
  const imageBlobs = allBlobs.filter( blob =>
    blob.pathname.startsWith( prefix ) &&
    blob.pathname.toLowerCase().endsWith( ".webp" )
  );

  const missing: StoredBlob[] = [];
  const photos = await mapWithConcurrency( imageBlobs, 16, async ( blob ): Promise<Photo> => {
    const meta = await readCache<PhotoMeta>( photoMetaKey( blob ) );
    if (meta) return { src: blob.url, ...meta };

    missing.push( blob );
    return { src: blob.url, weight: UNKNOWN_WEIGHT, ...await probeSize( blob.url ) };
  } );

  if (missing.length > 0) {
    waitUntil( fillPhotoMeta( missing ) );
  }

  return photos;
}


/**
 * Builds the cache key of a photo's metadata. Keyed by ETag, so each original is only downloaded again when it changes.
 * @param blob The photo's blob.
 * @returns The cache key.
 */
function photoMetaKey( blob: StoredBlob ): string {
  return `photo-meta-v2:${ blob.pathname }:${ blob.etag }`;
}


/**
 * Computes and caches the full metadata of the given photos; never rejects.
 * @param blobs The photos' blobs.
 * @returns Resolves once every photo has been processed.
 */
async function fillPhotoMeta( blobs: StoredBlob[] ): Promise<void> {
  const todo = blobs.filter( ( blob ) => !pendingMeta.has( photoMetaKey( blob ) ) );
  todo.forEach( ( blob ) => pendingMeta.add( photoMetaKey( blob ) ) );

  await mapWithConcurrency( todo, 4, async ( blob ) => {
    try {
      await writeCache( photoMetaKey( blob ), await withRetry( () => readPhotoMeta( blob.url ) ), PHOTO_META_TTL );
    } catch (error) {
      console.error( `Could not read metadata of ${ blob.pathname }`, error );
    } finally {
      pendingMeta.delete( photoMetaKey( blob ) );
    }
  } );
}


/**
 * Reads a WebP's dimensions from its first 30 bytes (one small range request).
 * @param url The image URL.
 * @returns The image dimensions, or FALLBACK_SIZE if they can't be read.
 */
async function probeSize( url: string ): Promise<ImageSize> {
  try {
    const response = await fetch( url, { headers: { Range: "bytes=0-29" } } );
    if (response.status === 206) {
      return parseWebpSize( new Uint8Array( await response.arrayBuffer() ) ) ?? FALLBACK_SIZE;
    }
    await response.body?.cancel();
  } catch {
    // Fall through to the default ratio.
  }
  return FALLBACK_SIZE;
}


/**
 * Reads a four-character code (RIFF chunk tag) from a byte buffer.
 * @param bytes The buffer.
 * @param offset Position of the first character.
 * @returns The four characters as a string.
 */
function readFourCC( bytes: Uint8Array, offset: number ): string {
  return String.fromCharCode( ...bytes.subarray( offset, offset + 4 ) );
}


/**
 * Parses a WebP file header.
 * @param bytes At least the first 30 bytes of the file.
 * @returns The image dimensions, or null if the header isn't a WebP header.
 */
function parseWebpSize( bytes: Uint8Array ): ImageSize | null {
  if (bytes.length < 30 || readFourCC( bytes, 0 ) !== "RIFF" || readFourCC( bytes, 8 ) !== "WEBP") return null;

  switch (readFourCC( bytes, 12 )) {
    case "VP8 ": // Lossy: 14-bit dimensions after the frame start code.
      return {
        width: ( bytes[26] | ( bytes[27] << 8 ) ) & 0x3fff,
        height: ( bytes[28] | ( bytes[29] << 8 ) ) & 0x3fff,
      };
    case "VP8L": { // Lossless: two 14-bit (value - 1) fields after the signature byte.
      const bits = bytes[21] | ( bytes[22] << 8 ) | ( bytes[23] << 16 ) | ( bytes[24] << 24 );
      return { width: ( bits & 0x3fff ) + 1, height: ( ( bits >>> 14 ) & 0x3fff ) + 1 };
    }
    case "VP8X": // Extended: 24-bit (value - 1) canvas size.
      return {
        width: 1 + ( bytes[24] | ( bytes[25] << 8 ) | ( bytes[26] << 16 ) ),
        height: 1 + ( bytes[27] | ( bytes[28] << 8 ) | ( bytes[29] << 16 ) ),
      };
    default:
      return null;
  }
}


/**
 * Downloads an original and computes its metadata.
 * @param url The original's URL.
 * @returns The photo's dimensions, resized weight and placeholder.
 */
async function readPhotoMeta( url: string ): Promise<PhotoMeta> {
  const response = await fetch( url );
  if (!response.ok) {
    throw new Error( `Failed to download ${ url }: ${ response.status }` );
  }

  // Loaded lazily: only needed for this background work, keeps cold starts light.
  const { default: sharp } = await import( "sharp" );
  const image = sharp( Buffer.from( await response.arrayBuffer() ) ).autoOrient();
  const { autoOrient } = await image.metadata();
  const [preview, probe] = await Promise.all( [
    image.clone()
      .resize( PLACEHOLDER_SIZE, PLACEHOLDER_SIZE, { fit: "inside" } )
      .webp( { quality: 70 } )
      .toBuffer(),
    image.clone()
      .resize( WEIGHT_PROBE_WIDTH, undefined, { withoutEnlargement: true } )
      .webp( { quality: IMAGE_QUALITY } )
      .toBuffer(),
  ] );

  return {
    width: autoOrient.width,
    height: autoOrient.height,
    weight: probe.length,
    placeholder: `data:image/webp;base64,${ preview.toString( "base64" ) }`,
  };
}


/**
 * Runs a task, retrying it when it throws.
 * @param task The task to run.
 * @param attempts Maximum number of attempts.
 * @returns The task's result.
 */
async function withRetry<T>( task: () => Promise<T>, attempts = 3 ): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts) throw error;
    }
  }
}


/**
 * Maps items with an async task, running at most `limit` tasks at a time.
 * @param items The items to map.
 * @param limit Maximum number of concurrent tasks.
 * @param task The async mapping function.
 * @returns The results, in the same order as `items`.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: ( item: T ) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>( items.length );
  let next = 0;

  const workers = Array.from( { length: Math.min( limit, items.length ) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task( items[index] );
    }
  } );

  await Promise.all( workers );
  return results;
}
