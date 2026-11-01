import { defineConfig, envField } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import { OPTIMIZED_WIDTHS } from "@/lib/image-config";

const blobStorage = {
  protocol: "https" as const,
  hostname: "*.public.blob.vercel-storage.com",
  pathname: "/**",
};

export default defineConfig( {
  output: "server",
  adapter: vercel( {
    // Pages are cached at the edge and regenerated hourly, so new uploads appear (and galleries reshuffle) without a redeploy.
    isr: { expiration: 3600 },
    imageService: true,
    imagesConfig: {
      sizes: [...OPTIMIZED_WIDTHS],
      formats: ["image/webp"],
      minimumCacheTTL: 2678400,
      remotePatterns: [blobStorage],
    },
  } ),
  image: {
    remotePatterns: [blobStorage],
  },
  env: {
    schema: {
      // Read at runtime (never inlined); loaded from .env.local in dev.
      BLOB_READ_WRITE_TOKEN: envField.string( { context: "server", access: "secret" } ),
    },
  },
  build: {
    // Ships the (small) stylesheet inside the HTML so it doesn't block first paint.
    inlineStylesheets: "always",
  },
  vite: {
    plugins: [tailwindcss()],
  },
} );
