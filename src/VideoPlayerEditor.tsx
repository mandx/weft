import { useCallback, useRef, Ref, useState, useEffect } from 'react';
import FfmpegWrapper from './ffmpeg-wrapper';
import { useConstant } from './hooks';
import { closest, transform as transformRanges } from './ranges';
import RangesListEditor, { makeRange, Range } from './RangesListEditor';
import Recording, { createMemoryBlobResolver } from './Recording';
import { useRecordings } from './storage-swr';
import { classnames, triggerBlobDownload } from './utilities';
import VideoElement from './VideoElement';
import './VideoPlayerEditor.scss';

export interface VideoPlayerEditorProps {
  readonly className?: string;
  readonly recording: Readonly<Recording>;
}

export default function VideoPlayerEditor({ className, recording }: VideoPlayerEditorProps) {
  const ffmpeg = useConstant(() => new FfmpegWrapper());

  /*
  useEffect(() => {
    function reObj<T extends object>(value: T): unknown {
      return Object.fromEntries(Object.entries(value));
    }
    function listener(event: Event) {
      switch (event.type) {
        case 'output':
          console.info('FfmpegWrapper:', event.type, reObj(event));
          break;

        case 'progress':
          console.info('FfmpegWrapper:', event.type, reObj(event));
          break;

        case 'loaded':
          console.info('FfmpegWrapper:', event.type, reObj(event));
          break;

        case 'loaded-error':
          console.info('FfmpegWrapper:', event.type, reObj(event));
          break;

        default:
          console.warn('Unkown event type from FfmpegWrapper:', event.type, reObj(event));
      }
    }

    ffmpeg.addEventListener('output', listener);
    ffmpeg.addEventListener('progress', listener);
    ffmpeg.addEventListener('loaded', listener);
    ffmpeg.addEventListener('loaded-error', listener);

    return function () {
      ffmpeg.removeEventListener('output', listener);
      ffmpeg.removeEventListener('progress', listener);
      ffmpeg.removeEventListener('loaded', listener);
      ffmpeg.removeEventListener('loaded-error', listener);
    };
  }, [ffmpeg]);
  */

  const [blob, setBlob] = useState<Blob | undefined>(undefined);
  const [blobURL, setBlobURL] = useState<string>('');

  useEffect(
    function loadRecordingBlob() {
      let blobUrl: string = '';

      recording.getBlob().then((blob) => {
        setBlob(blob);
        setBlobURL((blobUrl = URL.createObjectURL(blob)));
      });

      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    },
    [recording]
  );

  const recordings = useRecordings();

  const videoElementRef: Ref<HTMLVideoElement> = useRef(null);
  const [duration, setDuration] = useState(0);
  const [playRanges, setPlayRanges] = useState<readonly Range[]>([]);

  const onDurationChange = useCallback(function (duration: number) {
    setDuration(duration * 1000);
  }, []);

  const onSliderThumbChange = useCallback(function (position: number) {
    const videoEl = videoElementRef.current;
    if (videoEl) {
      videoEl.currentTime = position / 1000;
    }
  }, []);

  const onMergedRangesChanged = useCallback(function (ranges: readonly Range[]): void {
    setPlayRanges(ranges);
  }, []);

  const onVideoPlaybackTimeUpdate = useCallback(
    function (this: HTMLVideoElement): void {
      const videoEl = videoElementRef.current;
      if (videoEl) {
        const result = closest(videoEl.currentTime * 1000, playRanges);
        if (!result.in && result.nextRange) {
          videoEl.currentTime = result.nextRange[0] / 1000;
        }
      }
    },
    [playRanges]
  );

  const onPlayBtnClick = useCallback(function () {
    videoElementRef.current?.play();
  }, []);

  const onExportToNewRecording = useCallback(
    async function exportToNewRecording(): Promise<void> {
      if (!blob) {
        return;
      }
      const newBlob = await ffmpeg.slice(
        blob,
        transformRanges(playRanges, (n) => n / 1000)
      );
      const thumbBlob = await recording.getThumbnailBlob();
      await recordings.add([
        new Recording(createMemoryBlobResolver(newBlob), createMemoryBlobResolver(thumbBlob), {
          filename: 'Sliced recording ' + new Date().toISOString(),
        }),
      ]);
    },
    [ffmpeg, recordings, blob, playRanges, recording]
  );

  const onExportToNewDownload = useCallback(
    async function exportToNewDownload(): Promise<void> {
      if (!blob) {
        return;
      }
      const newBlob = await ffmpeg.slice(
        blob,
        transformRanges(playRanges, (n) => n / 1000)
      );

      triggerBlobDownload(newBlob, recording.filename);
    },
    [blob, ffmpeg, playRanges, recording.filename]
  );

  return (
    <div className={classnames('video-player-editor', className)}>
      <VideoElement
        onInternalDurationChanged={onDurationChange}
        ref={videoElementRef}
        src={blobURL}
        className="video-player"
        controls
        autoPlay={false}
        preload="auto"
        onTimeUpdate={onVideoPlaybackTimeUpdate}
      />
      <RangesListEditor
        beforeButtons={
          <button className="btn" onClick={onPlayBtnClick}>
            Play
          </button>
        }
        afterButtons={
          <>
            <button className="btn" onClick={onExportToNewRecording}>
              Export selections to new recording
            </button>
            <button className="btn" onClick={onExportToNewDownload}>
              Export selections as a new video download
            </button>
          </>
        }
        key={`${blobURL}:${duration}`}
        max={duration}
        initialRanges={duration ? [makeRange(0, duration)] : []}
        onSliderThumbChange={onSliderThumbChange}
        onRangesChanged={undefined /*console.log.bind(console, 'onRangesChanged:')*/}
        onMergedRangesChanged={onMergedRangesChanged}
      />
    </div>
  );
}
