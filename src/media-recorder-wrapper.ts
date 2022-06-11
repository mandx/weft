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

  /** Get the stream being recorded */
  get stream(): MediaStream {
    return this.mediaRecorder.stream;
  }

  /**
   * Start the recorder; returns `this` recorder instance.
   */
  start() {
    this.mediaRecorder.start();
    return this;
  }

  /**
   * Stop recording. IF we want to start recording again, then we would have
   * to create a new `MediaRecorderWrapper` instance. Returns a promise with a
   * blob with all the recorded video data.
   *
   * @param {boolean} ignoreIfInactive - prevent raising `DOMException`s if the
   * recorder is already stopped.
   */
  async stop(ignoreIfInactive?: boolean): Promise<Blob> {
    if (!ignoreIfInactive || this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    return await this.blobPromise;
  }

  private handleRecorderStop(): void {
    if (this.blobPromiseResolver) {
      this.blobPromiseResolver(new Blob(this.chunks.splice(0), { type: 'video/webm' }));
    }
  }

  private handleRecorderChunk({ data }: BlobEvent): void {
    if (data.size) {
      console.log('Pushing', data.size, 'bytes');
      this.chunks.push(data);
    }
  }

  private handleRecorderError(event: Event): void {
    console.log('Recorder error:', event);
    this.mediaRecorder.stop();
  }
}

const VIDEO_CODECS: readonly string[] = ['flac', 'H.264', 'theora', 'opus', 'vp8', 'vp9'];
const AUDIO_CODECS: readonly string[] = ['mp3', 'aac', 'opus', 'vorbis'];
const CONTAINERS: readonly string[] = [
  '1d-interleaved-parityfec',
  '3gpp',
  '3gpp2',
  '3gpp-tt',
  'AV1',
  'BMPEG',
  'BT656',
  'CelB',
  'DV',
  'encaprtp',
  'example',
  'flexfec',
  'H261',
  'H263',
  'H263-1998',
  'H263-2000',
  'H264',
  'H264-RCDO',
  'H264-SVC',
  'H265',
  'iso.segment',
  'JPEG',
  'jpeg2000',
  'mj2',
  'MP1S',
  'MP2P',
  'MP2T',
  'mp4',
  'MP4V-ES',
  'MPV',
  'mpg',
  'mpeg',
  'mpeg4-generic',
  'nv',
  'ogg',
  'parityfec',
  'pointer',
  'quicktime',
  'raptorfec',
  'raw',
  'rtp-enc-aescm128',
  'rtploopback',
  'rtx',
  'scip',
  'smpte291',
  'SMPTE292M',
  'ulpfec',
  'vc1',
  'vc2',
  'vnd.CCTV',
  'vnd.dece.hd',
  'vnd.dece.mobile',
  'vnd.dece.mp4',
  'vnd.dece.pd',
  'vnd.dece.sd',
  'vnd.dece.video',
  'vnd.directv.mpeg',
  'vnd.directv.mpeg-tts',
  'vnd.dlna.mpeg-tts',
  'vnd.dvb.file',
  'vnd.fvt',
  'vnd.hns.video',
  'vnd.iptvforum.1dparityfec-1010',
  'vnd.iptvforum.1dparityfec-2005',
  'vnd.iptvforum.2dparityfec-1010',
  'vnd.iptvforum.2dparityfec-2005',
  'vnd.iptvforum.ttsavc',
  'vnd.iptvforum.ttsmpeg2',
  'vnd.motorola.video',
  'vnd.motorola.videop',
  'vnd.mpegurl',
  'vnd.ms-playready.media.pyv',
  'vnd.nokia.interleaved-multimedia',
  'vnd.nokia.mp4vr',
  'vnd.nokia.videovoip',
  'vnd.objectvideo',
  'vnd.radgamettools.bink',
  'vnd.radgamettools.smacker',
  'vnd.sealed.mpeg1',
  'vnd.sealed.mpeg4',
  'vnd.sealed.swf',
  'vnd.sealedmedia.softseal.mov',
  'vnd.uvvu.mp4',
  'vnd.youtube.yt',
  'vnd.vivo',
  'VP8',
  'webm',
];

type SupportedMediaFormats = { [container: string]: { video: string[]; audio: string[] } };

export function enumerateMediaFormats(): SupportedMediaFormats {
  const supportedFormats: SupportedMediaFormats = {};
  for (const container of CONTAINERS) {
    for (const videoCodec of VIDEO_CODECS) {
      if (MediaRecorder.isTypeSupported(`video/${container}; codecs="${videoCodec}"`)) {
        const formatCodecs = (supportedFormats[container] = supportedFormats[container] || {});
        const codecs = (formatCodecs.video = formatCodecs.video || []);
        codecs.push(videoCodec);
      }
    }

    for (const audioCodec of AUDIO_CODECS) {
      if (MediaRecorder.isTypeSupported(`audio/${container}; codecs="${audioCodec}"`)) {
        const formatCodecs = (supportedFormats[container] = supportedFormats[container] || {});
        const codecs = (formatCodecs.audio = formatCodecs.audio || []);
        codecs.push(audioCodec);
      }
    }
  }
  return supportedFormats;
}
