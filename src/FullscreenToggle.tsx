import React, { useState, useCallback } from 'react';

export default function FullscreenToggle() {
  const [enteringFullscreen, setEnteringFullscreen] = useState<boolean>(false);
  const [exitingFullscreen, setExitingFullscreen] = useState<boolean>(false);
  const [currentlyFullscreen, setCurrentlyFullscreen] = useState<boolean>(false);

  const enterFullscreen = useCallback(
    function enterFullscreenCb() {
      const element = document.getElementById('root');
      if (!element) {
        return;
      }

      setEnteringFullscreen(true);
      element.requestFullscreen().then(
        () => {
          setEnteringFullscreen(false);
          setCurrentlyFullscreen(true);
          setExitingFullscreen(false);
        },
        () => {
          setEnteringFullscreen(false);
          setCurrentlyFullscreen(false);
          setExitingFullscreen(false);
        }
      );
    },
    [setEnteringFullscreen, setExitingFullscreen, setCurrentlyFullscreen]
  );

  const exitFullscreen = useCallback(
    function enterFullscreenCb() {
      setExitingFullscreen(true);
      document.exitFullscreen().then(
        () => {
          setEnteringFullscreen(false);
          setCurrentlyFullscreen(false);
          setExitingFullscreen(false);
        },
        () => {
          setEnteringFullscreen(false);
          setCurrentlyFullscreen(false);
          setExitingFullscreen(false);
        }
      );
    },
    [setEnteringFullscreen, setExitingFullscreen, setCurrentlyFullscreen]
  );

  return (
    <button
      type="button"
      disabled={enteringFullscreen || exitingFullscreen}
      onClick={currentlyFullscreen ? exitFullscreen : enterFullscreen}>
      {currentlyFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    </button>
  );
}
