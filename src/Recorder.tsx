import React, { useState, useRef, useEffect, useCallback } from 'react';

import './Recorder.scss';
import MediaRecorderWrapper from './media-recorder-wrapper';
import RecordOptions, {
  Quality,
  MediaAccess,
  qualityToResolution,
  DEFAULT_RESOLUTION,
} from './RecordOptions';
import { DownloadUrl, createDownloadUrl } from './DownloadsList';

const HIDDEN: React.CSSProperties = { display: 'none ' };

interface RecorderProps {
  onNewDownloadUrl(downloadUrl: DownloadUrl): void;
}

export default function Recorder({ onNewDownloadUrl }: RecorderProps) {
  const imagePatternRef = useRef<HTMLImageElement>(null);
  const canvasPatternRef: React.MutableRefObject<CanvasPattern | null> = useRef(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const microphoneAudioRef = useRef<HTMLAudioElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const recorderRef: React.MutableRefObject<MediaRecorderWrapper | null> = useRef(null);

  const [quality, setQuality] = useState<Quality>('720p');
  const [screenAccess, setScreenAccess] = useState<MediaAccess>(MediaAccess.Inactive);
  const [cameraAccess, setCameraAccess] = useState<MediaAccess>(MediaAccess.Inactive);
  const [microphoneAccess, setMicrophoneAccess] = useState<MediaAccess>(MediaAccess.Inactive);
  const [recording, setRecording] = useState<boolean>(false);

  const [resolutionWidth, resolutionHeight] = qualityToResolution(quality, DEFAULT_RESOLUTION);

  // requestAnimationFrame loop state
  const frameRequestId: React.MutableRefObject<number> = useRef(0);
  const frameRequestContinue: React.MutableRefObject<boolean> = useRef(true);
  const lastFrameTimestamp: React.MutableRefObject<ReturnType<typeof performance.now>> = useRef(performance.now());

  const framesPerSecond = 30;
  const frameInterval: React.MutableRefObject<number> = useRef(1000 / framesPerSecond);

  const composeFrames = useCallback(
    function composeFramesCb(/* timestamp: number */) {
      cancelAnimationFrame(frameRequestId.current);
      if (frameRequestContinue.current) {
        frameRequestId.current = requestAnimationFrame(composeFrames);
      }

      const timestamp = performance.now();
      const lastTimestamp = lastFrameTimestamp.current;
      const elapsed = timestamp - lastTimestamp
      if (elapsed < frameInterval.current - 0.1) {
        return;
      }

      lastFrameTimestamp.current = timestamp;

      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        if (context) {
          if (!canvasPatternRef.current) {
            const imagePattern = imagePatternRef.current;
            if (imagePattern) {
              const pattern = context.createPattern(imagePattern, '');
              if (pattern) {
                canvasPatternRef.current = pattern;
              }
            } else {
              context.fillStyle = 'green';
            }
          }

          if (canvasPatternRef.current) {
            context.fillStyle = canvasPatternRef.current;
          } else {
            context.fillStyle = 'green';
          }

          context.fillRect(0, 0, canvasWidth, canvasHeight);

          const screenVideo = screenVideoRef.current;
          if (
            screenVideo &&
            screenVideo.srcObject instanceof MediaStream &&
            screenVideo.srcObject.active
          ) {
            const screenVideoWidth = screenVideo.videoWidth || 640;
            const screenVideoHeight = screenVideo.videoHeight || 480;
            const ratio = Math.min(
              canvasWidth / screenVideoWidth,
              canvasHeight / screenVideoHeight
            );
            const screenVideoX = (canvasWidth - screenVideoWidth * ratio) / 2;
            const screenVideoY = (canvasHeight - screenVideoHeight * ratio) / 2;

            context.drawImage(
              screenVideo,
              0,
              0,
              screenVideoWidth,
              screenVideoHeight,
              screenVideoX,
              screenVideoY,
              screenVideoWidth * ratio,
              screenVideoHeight * ratio
            );
          }

          const cameraVideo = cameraVideoRef.current;
          if (
            cameraVideo &&
            cameraVideo.srcObject instanceof MediaStream &&
            cameraVideo.srcObject.active
          ) {
            context.save();

            let cameraVideoWidth = cameraVideo.videoWidth;
            let cameraVideoHeight = cameraVideo.videoHeight;
            const cameraVideoAspectRatio = cameraVideoWidth / cameraVideoHeight;

            cameraVideoHeight = canvasHeight / 6;
            cameraVideoWidth = cameraVideoHeight * cameraVideoAspectRatio;

            context.beginPath();
            context.arc(
              canvasWidth - cameraVideoWidth - 10 + cameraVideoWidth / 2,
              canvasHeight - cameraVideoHeight - 10 + cameraVideoHeight / 2,
              Math.min(cameraVideoWidth, cameraVideoHeight) / 2,
              0,
              2 * Math.PI
            );
            context.clip();

            context.drawImage(
              cameraVideo,
              canvasWidth - cameraVideoWidth - 10,
              canvasHeight - cameraVideoHeight - 10,
              cameraVideoWidth,
              cameraVideoHeight
            );

            context.restore();
          }

          // const text = JSON.stringify(
          //   {
          //     cameraVideoSrc: !!cameraVideoRef.current?.srcObject,
          //   },
          //   undefined,
          //   2
          // );
          // const lines = text.split('\n');
          // context.font = 'bold 20px sans-serif';
          // context.fillStyle = 'blue';
          // for (let i = 0; i < lines.length; i++) {
          //   context.fillText(lines[i], 5, 5 + i * 15);
          // }
        }
      }
    },
    [canvasRef, canvasPatternRef, screenVideoRef, cameraVideoRef]
  );

  useEffect(() => {
    composeFrames();
    return () => {
      frameRequestContinue.current = false;
    };
  }, [composeFrames]);

  const toggleRecording = useCallback(
    function toggleRecordingCb() {
      const recorder = recorderRef.current;
      if (recorder) {
        console.log('Stopping recording');
        recorderRef.current = null;
        recorder.stop().then((blob) => {
          onNewDownloadUrl(createDownloadUrl(blob));
        });
        setRecording(false);
      } else {
        const tracks: MediaStreamTrack[] = [];

        const microphoneAudio = microphoneAudioRef.current;
        if (microphoneAccess === MediaAccess.Active && microphoneAudio) {
          tracks.push(...microphoneAudio.captureStream().getTracks());
        }

        const canvas = canvasRef.current;
        if (canvas) {
          tracks.push(...canvas.captureStream(25).getTracks());
        }

        if (tracks.length) {
          recorderRef.current = new MediaRecorderWrapper(new MediaStream(tracks)).start();
          setRecording(true);
        }
      }
    },
    [microphoneAccess, onNewDownloadUrl]
  );

  const deinitializeScreenStream = useCallback(function deinitializeScreenStreamCb() {
    const screenVideo = screenVideoRef.current;
    if (screenVideo && screenVideo.srcObject instanceof MediaStream) {
      const stream = screenVideo.srcObject;
      screenVideo.srcObject = null;
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const deinitializeCameraStream = useCallback(function deinitializeCameraStreamCb() {
    const cameraVideo = cameraVideoRef.current;
    if (cameraVideo && cameraVideo.srcObject instanceof MediaStream) {
      const stream = cameraVideo.srcObject;
      cameraVideo.srcObject = null;
      stream.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const deinitializeMicrophoneStream = useCallback(function deinitializeMicrophoneStreamCb() {
    // TODO: Safely save a reference to the microphone media stream;
    //       so we can remove and stop the exact tracks added when we
    //       obtained a microphone audio stream. Right now, we just remove
    //       all audio tracks, since the only audio we request comes from
    //       the system's microphone.
    const recorderStream = recorderRef.current?.stream;
    recorderStream?.getAudioTracks().forEach((track) => {
      recorderStream.removeTrack(track);
      track.stop();
    });
  }, []);

  const requestScreenAccess = useCallback(
    function requestScreenAccessCb(access: MediaAccess): void {
      if (access === MediaAccess.Active) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((stream) => {
            setScreenAccess(MediaAccess.Active);
            stream.addEventListener('inactive', function screenStreamEnded() {
              setScreenAccess(MediaAccess.Inactive);
            });

            const videoEl = screenVideoRef.current;
            if (videoEl) {
              videoEl.srcObject = stream;
              videoEl.play();
            }
          })
          .catch((error) => {
            console.warn('Error accessing screen stream:', `${error.message} (${error.name})`);
            setScreenAccess(
              error.name !== 'NotAllowedError' ? MediaAccess.Error : MediaAccess.Inactive
            );
          });
      } else if (access === MediaAccess.Inactive) {
        deinitializeScreenStream();
        setScreenAccess(MediaAccess.Inactive);
      }
    },
    [deinitializeScreenStream]
  );

  const requestCameraAccess = useCallback(
    function requestCameraAccessCb(access: MediaAccess): void {
      if (access === MediaAccess.Active) {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            setCameraAccess(MediaAccess.Active);
            stream.addEventListener('inactive', function cameraStreamEnded() {
              setCameraAccess(MediaAccess.Inactive);
            });

            const videoEl = cameraVideoRef.current;
            if (videoEl) {
              videoEl.srcObject = stream;
              videoEl.play();
            }
          })
          .catch((error) => {
            console.warn('Error accessing camera stream:', `${error.message} (${error.name})`);
            setCameraAccess(
              error.name === 'NotAllowedError' ? MediaAccess.Inactive : MediaAccess.Error
            );
          });
      } else if (MediaAccess.Inactive) {
        deinitializeCameraStream();
        setCameraAccess(MediaAccess.Inactive);
      }
    },
    [deinitializeCameraStream]
  );

  const requestMicrophoneAccess = useCallback(
    function requestMicrophoneAccessCb(access: MediaAccess): void {
      if (access === MediaAccess.Active) {
        navigator.mediaDevices
          .getUserMedia({
            video: false,
            audio: { echoCancellation: true, noiseSuppression: true },
          })
          .then((stream) => {
            setMicrophoneAccess(MediaAccess.Active);
            stream.addEventListener('inactive', function microphoneStreamEnded() {
              setMicrophoneAccess(MediaAccess.Inactive);

              const recorder = recorderRef.current;
              if (recorder) {
                stream.getTracks().forEach((track) => {
                  recorder.stream.removeTrack(track);
                });
              }
            });

            const audioEl = microphoneAudioRef.current;
            if (audioEl) {
              audioEl.srcObject = stream;
              audioEl.play();
              const recorder = recorderRef.current;
              if (recorder) {
                stream.getTracks().forEach((track) => {
                  recorder.stream.addTrack(track);
                });
              }
            }
          })
          .catch((error) => {
            console.warn('Error accessing microphone stream:', `${error.message} (${error.name})`);
            setMicrophoneAccess(
              error.name === 'NotAllowedError' ? MediaAccess.Inactive : MediaAccess.Error
            );
          });
      } else if (access === MediaAccess.Inactive) {
        deinitializeMicrophoneStream();
        setMicrophoneAccess(MediaAccess.Inactive);
      }
    },
    [deinitializeMicrophoneStream]
  );

  useEffect(() => {
    return function () {
      recorderRef.current?.stop(true);
      deinitializeScreenStream();
      deinitializeCameraStream();
      deinitializeMicrophoneStream();
    };
  }, [deinitializeScreenStream, deinitializeCameraStream, deinitializeMicrophoneStream]);

  return (
    <div className="recorder">
      <canvas
        ref={canvasRef}
        className="recording-canvas"
        width={resolutionWidth}
        height={resolutionHeight}
      />

      <RecordOptions
        recording={recording}
        toggleRecording={toggleRecording}
        quality={quality}
        onChangeQuality={setQuality}
        screenAccess={screenAccess}
        requestScreenAccess={requestScreenAccess}
        cameraAccess={cameraAccess}
        requestCameraAccess={requestCameraAccess}
        microphoneAccess={microphoneAccess}
        requestMicrophoneAccess={requestMicrophoneAccess}
      />

      <video ref={screenVideoRef} style={HIDDEN} />
      <video ref={cameraVideoRef} style={HIDDEN} />
      <audio ref={microphoneAudioRef} style={HIDDEN} />

      <img
        ref={imagePatternRef}
        src="data:image/png;base64,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"
        alt="bg-pattern"
        style={HIDDEN}
      />
    </div>
  );
}
