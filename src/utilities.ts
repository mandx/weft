import * as st from 'simple-runtypes';

export function isBlobPartEmpty(blobPart: BlobPart | null | undefined): boolean {
  if (!blobPart) {
    return true;
  }

  if (blobPart instanceof Blob) {
    return !!blobPart.size;
  }

  const byteLength: unknown = (blobPart as any).byteLength;
  // ArrayBuffer and ArrayBufferView
  if (typeof byteLength === 'number') {
    return !!byteLength;
  }

  return false;
}

export function formatBytes(bytes: number, decimals?: number) {
  decimals = decimals || 2;
  const base = 1024;

  if (bytes === 0) {
    return '0 Bytes';
  }

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(base));
  return (bytes / Math.pow(base, i)).toFixed(decimals) + ' ' + sizes[i];
}

export function isTruthy(arg: unknown): boolean {
  return !!arg;
}

function classNameArgTransform(arg: unknown): string {
  if (!arg) {
    return '';
  }

  // const argType = typeof arg;
  if (typeof arg === 'string' || typeof arg === 'number') {
    return '' + arg;
  }

  if (Array.isArray(arg) && arg.length) {
    return classnames(...arg);
  }

  if (typeof arg === 'object') {
    if (arg.toString !== Object.prototype.toString) {
      return arg.toString();
    }

    return Object.entries(arg as any)
      .filter((entry) => !!entry[1])
      .map((entry) => entry[0])
      .join(' ');
  }

  return '';
}

export function classnames(...args: unknown[]): string {
  return Array.from(args).map(classNameArgTransform).filter(isTruthy).join(' ');
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function noop() {}

export function identity<T>(x: T): T {
  return x;
}

/**
 * Utility to workaround `HTMLVideoElement.duration` issues on "unseekable" videos.
 * Basically it creates a detached `video` element, sets `videoSrc` as its `src`
 * and then makes it seek to some arbitrarily big timestamp.
 *
 * This is mainly needed in Chrome, since it produces unseekable WebM videos.
 * (as of 2021-01-02)
 * See https://bugs.chromium.org/p/chromium/issues/detail?id=642012
 *
 * TODO: Maybe race this promise against a timeout?
 */
export function videoDurationWorkaround(videoSrc: Blob | string): Promise<number> {
  // return new Promise((resolve) => {
  //   const url = videoSrc instanceof Blob ? URL.createObjectURL(videoSrc) : videoSrc;
  //   const videoEl = document.createElement('video');
  //   videoEl.onloadedmetadata = function () {
  //     videoEl.currentTime = 1e101;
  //   };
  //   videoEl.ondurationchange = function () {
  //     if (videoEl.duration !== +Infinity) {
  //       resolve(videoEl.duration);
  //       if (videoSrc instanceof Blob) {
  //         URL.revokeObjectURL(url);
  //       }
  //     }
  //   };
  //   videoEl.preload = 'metadata';
  //   videoEl.src = url;
  // });

  const url = videoSrc instanceof Blob ? URL.createObjectURL(videoSrc) : videoSrc;
  const videoEl = document.createElement('video');
  videoEl.src = url;
  const promise = forceVideoDurationFetch(videoEl);
  promise.finally(function () {
    if (videoSrc instanceof Blob) {
      URL.revokeObjectURL(url);
    }
  });
  return promise;
}

export function forceVideoDurationFetch(videoEl: HTMLVideoElement): Promise<number> {
  return new Promise(function (resolve) {
    function metadataLoaded(this: HTMLVideoElement) {
      this.removeEventListener('loadedmetadata', metadataLoaded);
      this.currentTime = 1e101;
    }

    function durationChanged(this: HTMLVideoElement) {
      if (this.duration !== +Infinity) {
        this.removeEventListener('durationchange', durationChanged);
        resolve(videoEl.duration);
      }
    }

    videoEl.preload = 'metadata';
    videoEl.addEventListener('loadedmetadata', metadataLoaded);
    videoEl.addEventListener('durationchange', durationChanged);
  });
}

export function saveToLocalStorage(key: string, value: unknown): void {
  function createCircularReplacer() {
    const visited = new WeakSet();
    return function circularReplacer(_key: string, value: unknown): unknown {
      if (typeof value === 'object' && value !== null) {
        if (visited.has(value)) {
          return;
        }
        visited.add(value);
      }
      return value;
    };
  }

  return localStorage.setItem(key, JSON.stringify(value, createCircularReplacer()));
}

export function loadFromLocalStorage<T>(key: string, runtype: st.Runtype<T>, defaultValue?: T): T {
  const v = localStorage.getItem(key);
  try {
    return runtype(
      ((): unknown => {
        try {
          return JSON.parse(v || '');
        } catch (error) {
          throw new st.RuntypeError(
            `Error loading "${key}" from localStorage: ${(error as Error).message}`,
            v,
            []
          );
        }
      })()
    );
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.setAttribute('href', blobUrl);
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(blobUrl);
    document.body.removeChild(anchor);
  });
}

export function camelCaseToDashCase(s: string): string {
  return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type MakeRequired<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> & Required<T, K>;
