'use client'

import NextImage, { ImageProps } from 'next/image'
import React from 'react'

type ImageWithFallbackProps = Omit<ImageProps, 'onError'> & {
  fallbackSrc?: string;
};

/**
 * File types that yield zero benefit from Next.js optimization:
 * - SVG  → vector, already resolution-independent
 * - GIF  → animation frames are destroyed by WebP conversion
 * - WEBP → already optimized at the source
 */
const UNOPTIMIZED_EXTENSIONS = new Set( ['.svg', '.gif', '.webp'] );

/**
 * Returns true if the src URL targets a file type that should bypass
 * Next.js optimization to avoid wasteful transformations and cache writes.
 */
const shouldSkipOptimization = ( src: ImageProps['src'] ): boolean => {
  if (typeof src !== 'string') return false;
  const lower = src.toLowerCase().split( '?' )[ 0 ];
  return UNOPTIMIZED_EXTENSIONS.has( '.' + lower.split( '.' ).pop() );
};

/**
 * Creates an error handler that bypasses Next.js image optimization
 * by clearing srcset and falling back to the raw src URL.
 */
const createFallbackHandler =
  ( fallbackSrc: string ) =>
    ( e: React.SyntheticEvent<HTMLImageElement> ): void => {
      const img = e.currentTarget;
      img.srcset = ''; // clear Next.js generated srcset.
      img.src = fallbackSrc;
    };

/**
 * Drop-in replacement for Next.js <Image /> that:
 *    Automatically skips optimization for SVG / GIF / already-WebP sources.
 *    Falls back to the raw image URL if the optimized request fails.
 */
const ImageWithFallback = ( {
                              src,
                              fallbackSrc,
                              unoptimized,
                              ...props
                            }: ImageWithFallbackProps ) => {
  const resolvedFallback =
    fallbackSrc ?? (typeof src === 'string' ? src : '');

  const resolvedUnoptimized =
    unoptimized ?? shouldSkipOptimization( src );

  return (
    <NextImage
      src={ src }
      unoptimized={ resolvedUnoptimized }
      onError={
        resolvedUnoptimized
          ? undefined
          : createFallbackHandler( resolvedFallback )
      }
      { ...props }
    />
  );
};

export default ImageWithFallback;