import { useCallback, forwardRef, useEffect, HTMLProps } from 'react';

import { forceVideoDurationFetch } from './utilities';

interface VideoElementProps {
  onInternalDurationChanged?: (duration: number) => void;
}

export const VideoElement = forwardRef<
  HTMLVideoElement,
  VideoElementProps & HTMLProps<HTMLVideoElement>
>(function VideoElement(
  { onInternalDurationChanged, src: videoSrc, onLoadedMetadata, onDurationChange, ...props },
  videoRef
) {
  if (typeof videoRef === 'function') {
    console.error('VideoElement\'s forwarded Ref is a function; it should be a `React.MutableRefObject` instance.');
  }

  const checkVideoDuration = useCallback(() => {
    const videoEl = typeof videoRef === 'function' ? undefined : videoRef?.current;
    if (videoEl && videoEl.readyState > 0) {
      const duration = videoEl.duration;
      if (duration && duration !== +Infinity) {
        onInternalDurationChanged?.(duration);
      }
    }
  }, [onInternalDurationChanged, videoRef]);

  const loadedMetadata = useCallback(
    function () {
      // @ts-ignore
      onLoadedMetadata?.apply(this, arguments);
      setTimeout(checkVideoDuration);
    },
    [onLoadedMetadata, checkVideoDuration]
  );

  const durationChanged = useCallback(
    function () {
      // @ts-ignore
      onDurationChange?.apply(this, arguments);
      setTimeout(checkVideoDuration);
    },
    [onDurationChange, checkVideoDuration]
  );

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
    const videoEl = typeof videoRef === 'function' ? undefined : videoRef?.current;
    if (videoEl) {
      forceVideoDurationFetch(videoEl).then(function () {
        videoEl.currentTime = 0;
      });
    }
  }, [videoSrc, videoRef]);

  return (
    <video
      {...props}
      src={videoSrc}
      ref={videoRef}
      onLoadedMetadata={loadedMetadata}
      onDurationChange={durationChanged}
    />
  );
});

export default VideoElement;
