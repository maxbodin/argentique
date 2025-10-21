import Link from "next/link";
import { getGalleryFolders } from "@/app/lib/data";

export const revalidate = 3600;

export default async function HomePage() {
  const galleryFolders = await getGalleryFolders();

  return (
    <main className="container mx-auto mt-64 px-10 py-10">
      { galleryFolders.map( ( gallery ) => (
        <Link
          key={ gallery }
          href={ `/gallery/${ gallery }` }
          className="group relative block overflow-hidden mb-2"
        >
          <h1 className="text-2xl tracking-widest uppercase">
            { gallery.replace( /-/g, " " ) }
          </h1>
        </Link>
      ) ) }
    </main>
  );
}