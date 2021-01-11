import { CSSProperties } from 'react';

export interface AppBackground {
  $name: string;
  image: CSSProperties['backgroundImage'];
  attachment?: CSSProperties['backgroundAttachment'];
  color?: CSSProperties['backgroundColor'];
  position?: CSSProperties['backgroundPosition'];
  repeat?: CSSProperties['backgroundRepeat'];
  size?: CSSProperties['backgroundSize'];
}

export function backgroundAsStyles(appBackground: AppBackground): CSSProperties {
  return {
    backgroundImage: appBackground.image,
    backgroundAttachment: appBackground.attachment,
    backgroundColor: appBackground.color,
    backgroundPosition: appBackground.position,
    backgroundRepeat: appBackground.repeat,
    backgroundSize: appBackground.size,
  };
}

const CSS_FIELDS = ['attachment', 'color', 'image', 'position', 'repeat', 'size'];
const APP_BACKGROUND_FIELDS = ['$name', ...CSS_FIELDS];

export function isAppBackgroundArray(value: unknown): value is AppBackground[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return (
    value.filter((v) => {
      if (!v) {
        return false;
      }

      for (const field of APP_BACKGROUND_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(v, field) || typeof v[field] !== 'string') {
          return false;
        }
      }

      return true;
    }).length === value.length
  );
}
