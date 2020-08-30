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
