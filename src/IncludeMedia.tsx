import {
  HTMLProps,
  createElement,
  MutableRefObject,
  Fragment,
  useMemo,
  useRef,
  useCallback,
} from 'react';

import { useCombinedRefs } from './hooks';

type PossibleMediaElements = {
  audio: HTMLAudioElement;
  video: HTMLVideoElement;
};

type MediaElement<T extends string> = T extends keyof PossibleMediaElements
  ? PossibleMediaElements[T]
  : HTMLMediaElement;

export interface IncludeMediaProps<E extends string> extends HTMLProps<HTMLButtonElement> {
  tagName: E;
  mediaSource: 'display' | 'user';
  mediaConstraints?: MediaStreamConstraints;
  type?: 'button' | 'submit' | 'reset';
  mediaRef: MutableRefObject<MediaElement<E>>;
}

export default function IncludeMedia<E extends string>({
  tagName,
  mediaRef,
  mediaConstraints,
  mediaSource,
  ...props
}: IncludeMediaProps<E>) {
  const innerRef = useRef<MediaElement<E>>(null);
  const combinedRef = useCombinedRefs<MediaElement<E>>(mediaRef, innerRef);

  const constraints = useMemo(() => {
    const constraints = { ...(mediaConstraints || { video: true, audio: true }) };
    if (tagName === 'audio') {
      constraints.video = false;
    }
    return constraints;
  }, [tagName, mediaConstraints]);

  const requestMediaAccess = useCallback(
    function requestMediaAccessCb() {
      navigator.mediaDevices[
        // .getDisplayMedia(constraints)
        mediaSource === 'display' ? 'getUserMedia' : 'getDisplayMedia'
      ](constraints)
        .then((stream) => {
          // setScreenAllowed(true);
          const mediaEl = innerRef.current;
          if (mediaEl) {
            mediaEl.srcObject = stream;
            mediaEl.play();
          }
        })
        .catch((error) => {
          console.warn(error);
          // setScreenAllowed(false);
          const mediaEl = innerRef.current;
          if (mediaEl) {
            mediaEl.srcObject = null;
          }
        });
    },
    [
      innerRef,
      // setScreenAllowed,
      mediaSource,
      constraints,
    ]
  );

  return (
    <Fragment>
      <button {...props} onClick={requestMediaAccess} />
      {createElement(tagName, { ref: combinedRef })}
    </Fragment>
  );
}
