import Link from "next/link";
import { list } from "@vercel/blob";

// Revalidate the data every hour to fetch new galleries without a full redeploy.
export const revalidate = 3600;

export default async function HomePage() {
  // Fetch all blobs from Vercel's storage.
  const { blobs } = await list();

  // From the pathnames, extract the unique folder names.
  const galleryFolders = new Set(
    blobs.map( blob => blob.pathname.split( "/" )[0] )
  );

  return (
    <main className="container mx-auto mt-64 px-10 py-10">
      { Array.from( galleryFolders ).map( ( gallery ) => (
        <Link
          key={ gallery }
          href={ `/gallery/${ gallery }` }
          className="group relative block overflow-hidden"
        >
          <h1 className="text-2xl tracking-widest uppercase">
            { gallery.replace( /-/g, " " ) }
          </h1>
        </Link>
      ) ) }
    </main>
  );
}