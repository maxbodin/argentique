# Argentique

Argentique is a film photography portfolio built with Next.js App Router and powered by Vercel Blob storage.

The application automatically discovers galleries from blob folder names, statically renders gallery routes, and serves optimized image delivery with resilient fallback behavior.

## Contents

- [Core Features](#core-features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)

## Core Features

- Dynamic gallery index generated from Vercel Blob folder paths.
- Per-gallery route at `/gallery/[slug]`.
- Incremental static regeneration (ISR) for both index and gallery pages.
- Custom image component with:
	- automatic optimization bypass for `.webp`, `.gif`, and `.svg`.
	- graceful fallback to raw source URL if optimization fails.

## Architecture

### Request/Data Flow

1. Server code calls `list()` from `@vercel/blob`.
2. Blob listing is wrapped in `unstable_cache` (1-hour revalidation).
3. Gallery folder names are extracted and sorted by year/month prefix.
4. Home page links to each gallery slug.
5. Gallery page filters images by slug prefix and `.webp` extension.
6. UI renders through Next.js App Router with ISR.

### Route Contract

- `/`
	- Lists available galleries from blob folders.
	- Revalidates every 3600 seconds.
- `/gallery/[slug]`
	- Pre-generates static params from discovered gallery folders.
	- Revalidates every 3600 seconds.
	- Randomizes display order per regeneration cycle.

## Project Structure

```text
app/
	components/
		image-with-fallback.tsx   # Next.js Image wrapper with optimization/fallback logic
	gallery/
		[slug]/
			page.tsx                # Gallery page and static params generation
	lib/
		data.ts                   # Blob listing, caching, folder/image selection
	globals.css                 # Tailwind + global variables
	layout.tsx                  # App shell + metadata + footer
	page.tsx                    # Gallery index page
```