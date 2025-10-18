import Image from "next/image";
import Link from "next/link";
import { list } from "@vercel/blob";

type GalleryPageProps = {
  params: {
    slug: string;
  };
};

export async function generateStaticParams() {
  const { blobs } = await list();
  const galleryFolders = new Set(
    blobs.filter( blob => blob.pathname.includes( "/" ) )
      .map( blob => blob.pathname.split( "/" )[0] )
  );

  return Array.from( galleryFolders ).map( ( slug ) => ( {
    slug,
  } ) );
}

export const revalidate = 3600;

// Fisher-Yates shuffle function.
function shuffleArray(array: any[]) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

export default async function GalleryPage( { params: { slug } }: GalleryPageProps ) {
  const { blobs } = await list( {
    prefix: `${ slug }/`,
  } );

  const imageBlobs = blobs.filter( blob => blob.pathname.toLowerCase().endsWith( ".webp" ) );

  const shuffledImageBlobs = shuffleArray(imageBlobs);

  return (
    <main className="container mx-auto px-2 py-10">
      <div className="flex justify-between items-center mb-10 px-2">

        <h1 className="group font-bold">
          <Link
            href="/"
            className="text-[var(--foreground)] transition-colors duration-300 group-hover:text-[var(--hover-foreground)]"
          >
            &larr; Back to Galleries
          </Link>
        </h1>
        <h2 className="text-3xl md:text-4xl tracking-widest uppercase text-center">
          { slug.replace( /-/g, " " ) }
        </h2>
        <div className="w-40 hidden sm:block"></div>
        {/* Spacer */ }
      </div>

      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
        { shuffledImageBlobs.map( ( image ) => (
          <div key={ image.pathname } className="mb-4 break-inside-avoid">
            <Image
              src={ image.url }
              alt={ `Film photograph from the ${ slug } gallery by Maxime Bodin` }
              width={ 500 }
              height={ 750 }
              className="w-full h-auto"
              priority={ false }
            />
          </div>
        ) ) }
      </div>
    </main>
  );
}