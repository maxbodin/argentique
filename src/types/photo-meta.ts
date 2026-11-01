import type { Photo } from "@/types/photo";

/**
 * Everything about a photo that is computed from its original file and cached per file version.
 */
export type PhotoMeta = Required<Omit<Photo, "src">>;
