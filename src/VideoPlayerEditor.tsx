import { useCallback, useRef, Ref, useState } from 'react';
import { inRanges } from './ranges';
import RangesListEditor, { makeRange, Range } from './RangesListEditor';
import { classnames } from './utilities';
import VideoElement from './VideoElement';
import './VideoPlayerEditor.scss';

export interface VideoPlayerEditorProps {
  className?: string;
  src: string;
}

export default function VideoPlayerEditor({ className, src }: VideoPlayerEditorProps) {
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
        const result = inRanges(videoEl.currentTime * 1000, playRanges);
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

  return (
    <div className={classnames('video-player-editor', className)}>
      <VideoElement
        onInternalDurationChanged={onDurationChange}
        ref={videoElementRef}
        src={src}
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
        key={`${src}:${duration}`}
        max={duration}
        initialRanges={duration ? [makeRange(0, duration)] : []}
        onSliderThumbChange={onSliderThumbChange}
        onRangesChanged={console.log.bind(console, 'onRangesChanged:')}
        onMergedRangesChanged={onMergedRangesChanged}
      />
    </div>
  );
}
