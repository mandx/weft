export default class MediaRecorderWrapper {
  constructor(
    stream: MediaStream,
    options?: {
      mimeType?: string;
      audioBitsPerSecond?: number;
      videoBitsPerSecond?: number;
      bitsPerSecond?: number;
    }
  ) {
    this.handleRecorderChunk = this.handleRecorderChunk.bind(this);
    this.handleRecorderStop = this.handleRecorderStop.bind(this);
    this.handleRecorderError = this.handleRecorderError.bind(this);

    this.chunks = [];
    this.blobPromiseResolver = null;
    this.blobPromise = new Promise((resolve) => {
      this.blobPromiseResolver = resolve;
    });

    const mediaRecorder = (this.mediaRecorder = new MediaRecorder(stream, options));
    mediaRecorder.addEventListener('dataavailable', this.handleRecorderChunk);
    mediaRecorder.addEventListener('stop', this.handleRecorderStop);
    mediaRecorder.addEventListener('error', this.handleRecorderError);

    console.log('MediaRecorderWrapper initialized', this.mediaRecorder);
  }

  private mediaRecorder: MediaRecorder;
  private chunks: BlobPart[];
  private blobPromise: Promise<Blob>;
  private blobPromiseResolver: ((blob: Blob) => void) | null;

  get stream(): MediaStream {
    return this.mediaRecorder.stream;
  }

  start() {
    console.log('MediaRecorderWrapper started');
    this.mediaRecorder.start();
    return this;
  }

  async stop(ignoreIfInactive?: boolean): Promise<Blob> {
    console.log('MediaRecorderWrapper stopping');
    if (!ignoreIfInactive || this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    return await this.blobPromise;
  }

  handleRecorderStop(): void {
    if (this.blobPromiseResolver) {
      this.blobPromiseResolver(new Blob(this.chunks.splice(0), { type: 'video/webm' }));
    }
  }

  handleRecorderChunk({ data }: BlobEvent): void {
    if (data.size) {
      console.log('Pushing', data.size, 'bytes');
      this.chunks.push(data);
    }
  }

  handleRecorderError(event: Event): void {
    console.log('Recorder error:', event);
    this.mediaRecorder.stop();
  }
}
