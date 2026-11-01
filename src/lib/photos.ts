import { getImage } from "astro:assets";
import { IMAGE_QUALITY, OPTIMIZED_WIDTHS } from "@/lib/image-config";
import type { Photo } from "@/types/photo";

/**
 * Rendered photo width per breakpoint: Tailwind container minus `px-2` padding, split into the `columns-1 sm:columns-2 lg:columns-3` layout with `gap-4` gutters.
 */
export const GALLERY_SIZES = [
  "(min-width: 1536px) 496px",
  "(min-width: 1280px) 411px",
  "(min-width: 1024px) 326px",
  "(min-width: 768px) 368px",
  "(min-width: 640px) 304px",
  "calc(100vw - 16px)",
].join( ", " );


/**
 * Builds a photo's srcset: resized copies for every width below the original (Vercel Image Optimization in production, Astro's local sharp endpoint in dev), then the untouched original for screens that need full resolution.
 * @param photo The photo to build the srcset for.
 * @returns The `srcset` attribute value.
 */
export async function photoSrcSet( { src, width, height }: Photo ): Promise<string> {
  const resized = await Promise.all(
    OPTIMIZED_WIDTHS
      .filter( ( w ) => w < width )
      .map( async ( w ) => {
        const image = await getImage( {
          src,
          width: w,
          height: Math.round( w * height / width ),
          quality: IMAGE_QUALITY,
          format: "webp",
        } );
        return `${ image.src } ${ w }w`;
      } )
  );

  return [...resized, `${ src.replace( /,/g, "%2C" ) } ${ width }w`].join( ", " );
}


/**
 * Shuffles an array in place (Fisher-Yates).
 * @param array The array to shuffle.
 * @returns The same array, shuffled.
 */
function shuffleArray<T>( array: T[] ): T[] {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor( Math.random() * currentIndex );
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


/**
 * Picks a random photo among the lightest third (by resized weight).
 * @param photos The photos to pick from (must not be empty).
 * @returns The picked photo.
 */
function pickLight( photos: Photo[] ): Photo {
  const pool = [...photos]
    .sort( ( a, b ) => a.weight - b.weight )
    .slice( 0, Math.ceil( photos.length / 3 ) );

  return pool[Math.floor( Math.random() * pool.length )];
}


/**
 * Computes how tall a photo is relative to its width.
 * @param photo The photo to measure.
 * @returns Height divided by width (greater than 1 for portrait photos).
 */
function aspectRatio( photo: Photo ): number {
  return photo.height / photo.width;
}


/**
 * Shuffles the photos, then fills a phone's first screen (first photo + the top of the second) with random picks among the lightest third, so it loads sooner without touching image quality. The first photo is also among the tallest: it sits at the top of the first column on every layout, so it is the largest visible element (LCP).
 * @param photos The gallery's photos.
 * @returns A new array with the photos in display order.
 */
export function arrangePhotos( photos: Photo[] ): Photo[] {
  const shuffled = shuffleArray( [...photos] );
  if (shuffled.length < 3) return shuffled;

  const tallest = Math.max( ...shuffled.map( aspectRatio ) );
  const lead = pickLight( shuffled.filter( ( photo ) => aspectRatio( photo ) >= tallest - 0.01 ) );
  const rest = shuffled.filter( ( photo ) => photo !== lead );
  const second = pickLight( rest );

  return [lead, second, ...rest.filter( ( photo ) => photo !== second )];
}
