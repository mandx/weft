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
    if (arg!.toString !== Object.prototype.toString) {
      return arg!.toString();
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
