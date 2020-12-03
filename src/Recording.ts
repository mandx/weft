import { v4 as uuidv4 } from 'uuid';

export type ObjURL = ReturnType<typeof URL.createObjectURL>;

export type DatabaseID = ReturnType<typeof uuidv4>;

export default class Recording {
  private _databaseId: DatabaseID;
  private _url: ObjURL;
  private _timestamp: Date;
  private _filename: string;
  private _thumbnailUrl: ObjURL;

  constructor(
    src: Blob | ObjURL,
    thumbnail: Blob | ObjURL,
    options?: {
      filename?: string;
      databaseId?: DatabaseID;
    }
  ) {
    this._url = src instanceof Blob ? URL.createObjectURL(src) : src;
    this._thumbnailUrl = thumbnail instanceof Blob ? URL.createObjectURL(thumbnail) : thumbnail;
    this._timestamp = new Date();
    this._filename = options?.filename || `${this._timestamp.toISOString()}.webm`;
    this._databaseId = options?.databaseId || uuidv4();
  }

  get databaseId(): DatabaseID {
    return this._databaseId;
  }

  /**
   * URL of the video to be played; it can be a Blob URL or an external URL
   */
  get url(): ObjURL {
    return this._url;
  }

  /**
   * URL of the video to be played; it can be a Blob URL or an external URL
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
   * Check if this is an unsaved URL (hasn't been uploaded)
   */
  isUnsaved(): boolean {
    return this.url.startsWith('blob:');
  }

  cloneWithNewFilename(newFilename: string): Recording {
    return new Recording(this._url, this._thumbnailUrl, {
      filename: newFilename,
    });
  }

  revokeURLs(): void {
    URL.revokeObjectURL(this._url);
    URL.revokeObjectURL(this._thumbnailUrl);
  }
}
