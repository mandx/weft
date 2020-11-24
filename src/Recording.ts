type URLStr = ReturnType<typeof URL.createObjectURL>;

export default class Recording {
  private _url: URLStr;
  private _timestamp: Date;
  private _filename: string;
  private _thumbnailUrl: URLStr;

  constructor(src: Blob | URLStr, thumbnail: Blob | URLStr, filename?: string) {
    this._url = src instanceof Blob ? URL.createObjectURL(src) : src;
    this._thumbnailUrl = thumbnail instanceof Blob ? URL.createObjectURL(thumbnail) : thumbnail;
    this._timestamp = new Date();
    this._filename = filename || `${this._timestamp.toISOString()}.webm`;
  }

  /**
   * URL of the video to be played; it can be a Blob URL or an external URL
   */
  get url(): URLStr {
    return this._url;
  }

  /**
   * URL of the video to be played; it can be a Blob URL or an external URL
   */
  get thumbnailUrl(): URLStr {
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
    return new Recording(this._url, this._thumbnailUrl, newFilename);
  }

  revokeURLs(): void {
    URL.revokeObjectURL(this._url);
    URL.revokeObjectURL(this._thumbnailUrl);
  }
}
