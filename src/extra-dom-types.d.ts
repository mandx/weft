interface BlobEvent extends Event {
  data: Blob;
  timecode: DOMHighResTimeStamp;
}

interface MediaRecorder extends EventTarget {
  pause(): void;
  requestData(): void;
  resume(): void;
  start(): void;
  stop(): void;

  readonly mimeType: string;
  readonly state: 'inactive' | 'recording' | 'paused';
  readonly stream: MediaStream;
  ignoreMutedMedia: boolean;
  readonly videoBitsPerSecond: number;
  readonly audioBitsPerSecond: number;

  addEventListener(
    type: 'dataavailable',
    listener: (ev: BlobEvent) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ): void;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
declare const MediaRecorder: {
  prototype: MediaRecorder;

  static isTypeSupported(mimeType: string): boolean;

  new (
    stream: MediaStream,
    options?: {
      mimeType?: string;
      audioBitsPerSecond?: number;
      videoBitsPerSecond?: number;
      bitsPerSecond?: number;
    }
  ): MediaRecorder;
};

interface MediaDevices extends EventTarget {
  getDisplayMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>;
}

interface HTMLCanvasElement extends HTMLElement {
  captureStream(frameRate: number): MediaStream;
}
