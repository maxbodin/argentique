# Argentique

Film photography portfolio built with [Astro](https://astro.build), Vercel Blob and Vercel. Galleries are read from Blob folder names and served as zero-JavaScript pages.

## Features

- One gallery per Blob folder (`YYYY-MM-name/`), sorted newest first, at `/gallery/[slug]`.
- Pages cached at the edge and regenerated hourly (ISR): new uploads appear without a redeploy, and the photo order reshuffles.
- No client-side JavaScript; CSS and the font are inlined or preloaded.
- Photos (`src/components/GalleryPhoto.astro`):
	- Resized WebP q95 copies (384–828px) from Vercel Image Optimization; the original for full-resolution screens, or if optimization fails (free-plan limits).
	- Real dimensions (no layout shift) and a tiny inline placeholder.
	- First photo preloaded at high priority, the rest lazy-loaded. The first two are drawn from the lightest third so phones fill the first screen faster.

## How it works

1. The Blob listing is cached for 1 hour in the Vercel Runtime Cache.
2. Each photo's size, placeholder and weight are cached per file version (keyed by ETag).
3. Pages never wait on originals: uncached photos are sized from their WebP header, the rest is computed in the background for the next render.

## Project Structure

```text
src/
	components/GalleryPhoto.astro   # Photo markup
	layouts/Layout.astro            # Page shell, font, footer
	lib/data.ts                     # Blob listing, caching, photo metadata
	lib/image-config.ts             # Image quality and widths
	lib/photos.ts                   # srcset and photo order
	pages/index.astro               # Gallery list
	pages/gallery/[slug].astro      # Gallery page
	styles/global.css               # Tailwind and variables
	types/                          # Shared types
astro.config.ts                   # Vercel adapter, image optimization, Tailwind
```
