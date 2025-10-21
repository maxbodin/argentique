import { list, ListBlobResultBlob } from "@vercel/blob";
import { unstable_cache } from "next/cache";

/**
 * Fetches and caches ALL blobs from Vercel Blob storage.
 * The result of this function is cached for one hour.
 */
const getAllBlobs = unstable_cache(
  async () => {
    const { blobs } = await list();
    return blobs;
  },
  ["all-blobs"],
  {
    revalidate: 3600,
  }
);

/**
 * Gets the list of unique gallery folder names from the cached blob data.
 */
export async function getGalleryFolders(): Promise<string[]> {
  const allBlobs = await getAllBlobs();

  // Filter out blobs that are just folders (ending with '/') or don't have a path separator.
  const imageBlobs = allBlobs.filter( blob => blob.pathname.includes( "/" ) );

  const galleryFolders = new Set(
    imageBlobs.map( ( blob ) => blob.pathname.split( "/" )[0] )
  );

  return Array.from( galleryFolders );
}

/**
 * Gets the image blobs for a specific gallery slug from the cached blob data.
 * @param slug The gallery folder to filter by.
 */
export async function getGalleryImages( slug: string ): Promise<ListBlobResultBlob[]> {
  const allBlobs = await getAllBlobs();

  const prefix = `${ slug }/`;
  return allBlobs.filter( blob =>
    blob.pathname.startsWith( prefix ) &&
    blob.pathname.toLowerCase().endsWith( ".webp" )
  );
}