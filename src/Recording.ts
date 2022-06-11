import { v4 as uuidv4 } from 'uuid';

export type ObjURL = ReturnType<typeof URL.createObjectURL>;

export type DatabaseID = ReturnType<typeof uuidv4>;

export type BlobResolver = () => Promise<Blob>;

function cloneBlob(blob: Blob): Blob {
  return new Blob([blob], { type: blob.type });
}

/**
 * Creates a Blob resolver from an existing blob. It will simply return
 * Promises that resolve with the same given blob. This is specially useful
 * when working with unsaved recordings, where the video data is still memory
 * and not yet saved anywhere else.
 */
export function createMemoryBlobResolver(blob: Blob): BlobResolver {
  const clone = cloneBlob(blob);
  return function memoryBlobResolver() {
    return Promise.resolve(cloneBlob(clone));
  };
}

export default class Recording {
  private _blobResolver: BlobResolver;
  private _databaseId: DatabaseID;
  private _timestamp: Date;
  private _filename: string;
  private _thumbnailUrl: ObjURL;

  constructor(
    blobResolver: BlobResolver,
    thumbnail: Blob | ObjURL,
    options?: {
      filename?: string;
      databaseId?: DatabaseID;
    }
  ) {
    this._blobResolver = blobResolver;
    this._thumbnailUrl = thumbnail instanceof Blob ? URL.createObjectURL(thumbnail) : thumbnail;
    this._timestamp = new Date();
    this._filename = options?.filename || `${this._timestamp.toISOString()}.webm`;
    this._databaseId = options?.databaseId || uuidv4();
  }

  get databaseId(): DatabaseID {
    return this._databaseId;
  }

  /**
   * Returns a Blob instance of the video data for this recording. The idea is
   * that we don't want to load and keep around all the video data, eating all
   * the browser's memory and possibly crashing the page. So, if some other
   * component needs access to the video data, then it can request it using
   * this method.
   */
  getBlob(): Promise<Blob> {
    return this._blobResolver();
  }

  /**
   * Src URL of the recording's thumbnail
   */
  get thumbnailUrl(): ObjURL {
    return this._thumbnailUrl;
  }

  /**
   * Creation timestamp
   */
  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * Filename for the video; for example, used as the `download` attribute for
   * anchor elements
   */
  get filename(): string {
    return this._filename;
  }

  set filename(newFilename: string) {
    this._filename = newFilename;
  }

  /**
   * Creates a new recording item from an existing one; the new item's data
   * (video + thumbnail) is still backed by the original item.
   */
  cloneWithNewFilename(newFilename: string): Recording {
    return new Recording(this._blobResolver, this._thumbnailUrl, {
      filename: newFilename,
      databaseId: this._databaseId,
    });
  }

  revokeURLs(): void {
    // URL.revokeObjectURL(this._url);
    URL.revokeObjectURL(this._thumbnailUrl);
  }
}
