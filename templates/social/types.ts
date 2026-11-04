export type SocialValues = Record<string, unknown>;
export type SocialImages = Record<string, HTMLImageElement>;
export interface SocialArtwork {
  width: number;
  height: number;
  fonts?: boolean;
  prepare?: () => Promise<void>;
  optionalImages?: boolean;
  previewTime?: number;
  referenceDuration?: number;
  usesSceneDuration?: boolean;
  responsive?: boolean;
  background?: (values: SocialValues) => string;
  images: (values: SocialValues) => Record<string, string>;
  draw: (ctx: CanvasRenderingContext2D, values: SocialValues, images: SocialImages, seconds?: number, width?: number, height?: number, duration?: number) => void;
}
