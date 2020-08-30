export type Quality = '720p' | '1080p';
export type Resolution = [number, number];

export const DEFAULT_RESOLUTION: Resolution = [1280, 720];

export function qualityToResolution(quality: unknown, defaultResolution: Resolution): Resolution {
  switch (quality) {
    case '720p': {
      return [1280, 720];
    }
    case '1080p': {
      return [1920, 1080];
    }
  }
  return defaultResolution;
}
