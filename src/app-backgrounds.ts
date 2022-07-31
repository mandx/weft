import { CSSProperties } from 'react';
import { camelCaseToDashCase } from './utilities';

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

export function applyBackgroundToElement(background: AppBackground, element: HTMLElement): void {
  const cssProps = backgroundAsStyles(background);
  for (const k of Object.keys(cssProps)) {
    if (k[0] !== '$') {
      element.style.setProperty('--' + camelCaseToDashCase(k), (cssProps as any)[k] || null);
    }
  }
}

const DEFAULT_CSS_VALUES = {
  backgroundImage: 'none',
  backgroundAttachment: 'scroll',
  backgroundColor: 'transparent',
  backgroundPosition: '0% 0%',
  backgroundRepeat: 'repeat',
  backgroundSize: 'auto auto',
} as const;

export function applyBackgroundToStylesheet(
  background: AppBackground,
  stylesheet: CSSStyleSheet
): void {
  const cssProps = backgroundAsStyles(background);

  const cssRule = `:root {
    ${Object.keys(cssProps)
      .map(
        (k) =>
          `--${camelCaseToDashCase(k)} : ${
            cssProps[k as keyof typeof DEFAULT_CSS_VALUES] ||
            DEFAULT_CSS_VALUES[k as keyof typeof DEFAULT_CSS_VALUES]
          }`
      )
      .join(';\n')}
  }`;

  while (stylesheet.cssRules.length) {
    stylesheet.deleteRule(0);
  }
  stylesheet.insertRule(cssRule);
}
