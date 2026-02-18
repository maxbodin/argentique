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
 * Gets unique gallery folder names sorted from most recent to oldest.
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
 */
function compareFoldersByDateDesc( a: string, b: string ): number {
  const dateA = extractYearMonth( a );
  const dateB = extractYearMonth( b );

  return dateB.year - dateA.year || dateB.month - dateA.month;
}

/**
 * Extracts year and month from folder name.
 */
function extractYearMonth( folder: string ): { year: number; month: number } {
  const [year, month] = folder.split( "-", 2 );

  return {
    year: Number( year ),
    month: Number( month ),
  };
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