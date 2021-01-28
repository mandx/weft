import { useCallback, useRef, useState, ChangeEvent, useEffect } from 'react';

import { classnames, forceVideoDurationFetch } from './utilities';
import './VideoPlayerEditor.scss';
import RangesEditor, { Ranges } from './RangesEditor';
import { parseRangesText } from './ranges';

export interface VideoPlayerEditorProps {
  className?: string;
  videoSrc: string;
}

export default function VideoPlayerEditor({ className, videoSrc }: VideoPlayerEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);

  const loadedVideoMetadata = useCallback(() => {
    setTimeout(() => {
      const videoEl = videoRef.current;
      if (videoEl && videoEl.readyState > 0) {
        const duration = videoEl.duration;
        if (duration && duration !== +Infinity) {
          setVideoDuration(duration);
        }
      }
    });
  }, []);


  const [rangesText, setRangesText] = useState('');
  const [tmpRanges, setTmpRanges] = useState<Ranges>([]);

  const onTextAreaChange = useCallback(function textareaChangeHandler(
    event: ChangeEvent<HTMLTextAreaElement>
  ): void {
    const text = event.target.value;
    setRangesText(text);
    setTmpRanges(parseRangesText(text));
  },
  []);

  useEffect(() => {
    // NOTE: There's a Chrome bug that makes it produce unseekable WebM videos
    //       See https://bugs.chromium.org/p/chromium/issues/detail?id=642012
    //       So the contents of this effect is simply about to finding out the
    //       real duration of the video, by creating an off-document video
    //       element load the videoSrc and make it seek to some big number,
    //       this will trigger another `durationchange` event  then will
    //       (hopefully) will contain the actual duration.
    // TODO: Maybe only do this for Chrome, since it's the only one exposing this bug
    // const isChrome = window.navigator.userAgent.toLowerCase().indexOf('chrome') > -1 && !!window.chrome;
    // videoDurationWorkaround(videoSrc).then(setVideoDuration);
    const videoEl = videoRef.current;
    if (videoEl) {
      forceVideoDurationFetch(videoEl).then(function () {
        videoEl.currentTime = 0;
      });
    }
    // This is a different
  }, [videoSrc]);

  return (
    <div className={classnames('video-player-editor', className)}>
      <video
        src={videoSrc}
        ref={videoRef}
        className="video-player"
        controls
        autoPlay={false}
        preload="metadata"
        onLoadedMetadata={loadedVideoMetadata}
        onDurationChange={loadedVideoMetadata}
      />
      <RangesEditor ranges={tmpRanges} max={videoDuration || 0} />
      <textarea value={rangesText} onChange={onTextAreaChange} />
    </div>
  );
}
