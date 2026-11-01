/**
 * On-demand image optimization settings, shared by astro.config.ts (which whitelists the widths for Vercel Image Optimization) and the gallery markup (which requests them).
 */

/**
 * WebP quality of resized copies. q95 keeps film grain intact (SSIM ≥ 0.97 against the original rendered at the same size). AVIF is not used: at comparable file sizes it visibly smooths grain.
 */
export const IMAGE_QUALITY = 95;

/**
 * Widths served as resized copies. Above ~1000px a q95 re-encode weighs about as much as the original, so larger screens get the untouched original instead.
 */
export const OPTIMIZED_WIDTHS = [384, 480, 640, 750, 828];
