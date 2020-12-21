import React, {
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { SKIP_RECORDER_RENDER_LOOP } from './config';
import './Recorder.scss';
import MediaRecorderWrapper from './media-recorder-wrapper';
import RecordOptions, {
  Quality,
  MediaAccess,
  qualityToResolution,
  DEFAULT_RESOLUTION,
} from './RecordOptions';
import Recording, { createMemoryBlobResolver } from './Recording';
import { NotificationLevel } from './Notifications';

export const EMPTY_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const HIDDEN: React.CSSProperties = { display: 'none ' };

export type RecorderState = 'STARTED' | 'STOPPED';

interface RecorderProps {
  /** Callback that will be triggered when a new video blob is ready */
  readonly onNewRecording: (recording: Recording) => void;

  /** Callback to emit generic, app-wide, user notifications */
  readonly emitNotification: (content: ReactNode, level: NotificationLevel) => void;

  /** Signal when recording has been started/stopped */
  readonly onRecordingStateChange: (state: RecorderState) => void;
}

const FRAMES_PER_SECOND = 30;
const FRAME_INTERVAL = 1000 / FRAMES_PER_SECOND;

export default function Recorder({
  onNewRecording,
  emitNotification,
  onRecordingStateChange,
}: RecorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const microphoneAudioRef = useRef<HTMLAudioElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const screenStream: MutableRefObject<MediaStream | null> = useRef(null);
  const cameraStream: MutableRefObject<MediaStream | null> = useRef(null);
  const microphoneStream: MutableRefObject<MediaStream | null> = useRef(null);

  /** This needs to be kept in sync with the `recording` state variable */
  const recorderRef: MutableRefObject<MediaRecorderWrapper | null> = useRef(null);

  const [quality, setQuality] = useState<Quality>('720p');
  const [screenAccess, setScreenAccess] = useState<MediaAccess>('INACTIVE');
  const [cameraAccess, setCameraAccess] = useState<MediaAccess>('INACTIVE');
  const [microphoneAccess, setMicrophoneAccess] = useState<MediaAccess>('INACTIVE');

  /** This needs to be kept in sync with `recorderRef` */
  const [recording, setRecording] = useState<boolean>(false);

  const [resolutionWidth, resolutionHeight] = qualityToResolution(quality, DEFAULT_RESOLUTION);

  // const canvasPatternRef: MutableRefObject<CanvasPattern | null> = useRef(null);
  const thumbnailRef = useRef<string>(EMPTY_IMAGE);
  const imagePatternRef = useRef<HTMLImageElement>(null);
  // requestAnimationFrame loop state
  const frameRequestContinue: MutableRefObject<boolean> = useRef(true);
  const lastFrameTimestamp: MutableRefObject<ReturnType<typeof performance.now>> = useRef(0);

  // TODO: Allow choosing framerate
  // const framesPerSecond = 30;
  // const frameInterval: MutableRefObject<number> = useRef(1000 / framesPerSecond);

  const composeFrames = useCallback(
    function composeFramesCb(/* timestamp: number */) {
      if (frameRequestContinue.current) {
        requestAnimationFrame(composeFrames);
      }

      const timestamp = performance.now();
      const lastTimestamp = lastFrameTimestamp.current;
      const elapsed = timestamp - lastTimestamp;
      if (elapsed < FRAME_INTERVAL - 0.1) {
        return;
      }

      lastFrameTimestamp.current = timestamp;

      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;

        if (context) {
          // if (!canvasPatternRef.current) {
          //   const imagePattern = imagePatternRef.current;
          //   if (imagePattern) {
          //     const pattern = context.createPattern(imagePattern, '');
          //     if (pattern) {
          //       canvasPatternRef.current = pattern;
          //     }
          //   }
          // }

          const imagePattern = imagePatternRef.current;
          if (imagePattern) {
            const coverCoords = imageCoverCoordinates(
              imagePattern.naturalWidth,
              imagePattern.naturalHeight,
              canvasWidth,
              canvasHeight
            );
            context.drawImage(
              imagePattern,
              coverCoords.offsetLeft,
              coverCoords.offsetTop,
              coverCoords.width,
              coverCoords.height
            );
          }

          // context.fillStyle = canvasPatternRef.current || 'black';
          // context.fillRect(0, 0, canvasWidth, canvasHeight);

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
    [
      // canvasRef,
      // canvasPatternRef,
      // screenVideoRef,
      // cameraVideoRef,
    ]
  );

  useEffect(() => {
    if (SKIP_RECORDER_RENDER_LOOP) {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = 'black';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    } else {
      composeFrames();
    }

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
          onNewRecording(new Recording(createMemoryBlobResolver(blob), thumbnailRef.current));
        });
        setRecording(false);
        onRecordingStateChange('STOPPED');
      } else {
        const tracks: MediaStreamTrack[] = [];

        const microphoneAudio = microphoneAudioRef.current;
        if (microphoneAccess === 'ACTIVE' && microphoneAudio) {
          tracks.push(...microphoneAudio.captureStream().getTracks());
        }

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.toBlob((blob) => {
            thumbnailRef.current = URL.createObjectURL(blob);
          });
          tracks.push(...canvas.captureStream(FRAMES_PER_SECOND).getTracks());
        }

        if (tracks.length) {
          recorderRef.current = new MediaRecorderWrapper(new MediaStream(tracks)).start();
          setRecording(true);
          onRecordingStateChange('STARTED');
        }
      }
    },
    [microphoneAccess, onNewRecording, onRecordingStateChange]
  );

  const screenStreamEnded = useCallback(function screenStreamEndedCb() {
    screenStream.current = null;
    setScreenAccess('INACTIVE');
  }, []);

  const deinitializeScreenStream = useCallback(
    function deinitializeScreenStreamCb() {
      const recorderStream = recorderRef.current?.stream;

      screenStream.current?.removeEventListener('inactive', screenStreamEnded);
      screenStream.current?.getTracks().forEach((track) => {
        recorderStream?.removeTrack(track);
        track.stop();
      });

      const screenVideo = screenVideoRef.current;
      if (screenVideo) {
        screenVideo.src = '';
        screenVideo.srcObject = null;
      }
    },
    [screenStreamEnded]
  );

  const cameraStreamEnded = useCallback(function cameraStreamEndedCb() {
    cameraStream.current = null;
    setCameraAccess('INACTIVE');
  }, []);

  const deinitializeCameraStream = useCallback(
    function deinitializeCameraStreamCb() {
      const recorderStream = recorderRef.current?.stream;

      cameraStream.current?.removeEventListener('inactive', cameraStreamEnded);
      cameraStream.current?.getTracks().forEach((track) => {
        recorderStream?.removeTrack(track);
        track.stop();
      });

      const cameraVideo = cameraVideoRef.current;
      if (cameraVideo) {
        cameraVideo.src = '';
        cameraVideo.srcObject = null;
      }
    },
    [cameraStreamEnded]
  );

  const microphoneStreamEnded = useCallback(function microphoneStreamEndedCb() {
    microphoneStream.current = null;
    setMicrophoneAccess('INACTIVE');
  }, []);

  const deinitializeMicrophoneStream = useCallback(
    function deinitializeMicrophoneStreamCb() {
      const recorderStream = recorderRef.current?.stream;

      microphoneStream.current?.removeEventListener('inactive', microphoneStreamEnded);
      microphoneStream.current?.getTracks().forEach((track) => {
        recorderStream?.removeTrack(track);
        track.stop();
      });

      const micAudio = microphoneAudioRef.current;
      if (micAudio) {
        micAudio.src = '';
        micAudio.srcObject = null;
      }
    },
    [microphoneStreamEnded]
  );

  const cleanupRecorder = useCallback(function cleanupRecorderCb() {
    const recorderStream = recorderRef.current?.stream;
    recorderStream?.getTracks().forEach((track) => {
      console.warn('Track ', track.id, 'was not cleaned up...');
      recorderStream.removeTrack(track);
      track.stop();
    });
  }, []);

  const requestScreenAccess = useCallback(
    function requestScreenAccessCb(access: MediaAccess): void {
      if (access === 'ACTIVE') {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((stream) => {
            screenStream.current = stream;
            setScreenAccess('ACTIVE');
            stream.addEventListener('inactive', screenStreamEnded);

            const screenVideoEl = screenVideoRef.current;
            if (screenVideoEl) {
              screenVideoEl.srcObject = stream;
              screenVideoEl.play();
            }
          })
          .catch((error) => {
            console.warn('Error accessing screen stream:', `${error.message} (${error.name})`);
            setScreenAccess(error.name !== 'NotAllowedError' ? 'ERROR' : 'INACTIVE');

            if (error.name === 'NotAllowedError') {
              emitNotification(`Screen access cancelled`, 'info');
            } else {
              emitNotification(`Error accessing screen: ${error.message} (${error.name})`, 'error');
            }
          });
      } else if (access === 'INACTIVE') {
        deinitializeScreenStream();
        setScreenAccess('INACTIVE');
      }
    },
    [screenStreamEnded, deinitializeScreenStream, emitNotification]
  );

  const requestCameraAccess = useCallback(
    function requestCameraAccessCb(access: MediaAccess): void {
      if (access === 'ACTIVE') {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            cameraStream.current = stream;
            setCameraAccess('ACTIVE');
            stream.addEventListener('inactive', cameraStreamEnded);

            const cameraVideoEl = cameraVideoRef.current;
            if (cameraVideoEl) {
              cameraVideoEl.srcObject = stream;
              cameraVideoEl.play();
            }
          })
          .catch((error) => {
            console.warn('Error accessing camera stream:', `${error.message} (${error.name})`);
            setCameraAccess(error.name === 'NotAllowedError' ? 'INACTIVE' : 'ERROR');
          });
      } else if (access === 'INACTIVE') {
        deinitializeCameraStream();
        setCameraAccess('INACTIVE');
      }
    },
    [cameraStreamEnded, deinitializeCameraStream]
  );

  const requestMicrophoneAccess = useCallback(
    function requestMicrophoneAccessCb(access: MediaAccess): void {
      if (access === 'ACTIVE') {
        navigator.mediaDevices
          .getUserMedia({
            video: false,
            audio: { echoCancellation: true, noiseSuppression: true },
          })
          .then((stream) => {
            microphoneStream.current = stream;
            setMicrophoneAccess('ACTIVE');
            stream.addEventListener('inactive', microphoneStreamEnded);

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
            setMicrophoneAccess(error.name === 'NotAllowedError' ? 'INACTIVE' : 'ERROR');
          });
      } else if (access === 'INACTIVE') {
        deinitializeMicrophoneStream();
        setMicrophoneAccess('INACTIVE');
      }
    },
    [microphoneStreamEnded, deinitializeMicrophoneStream]
  );

  useEffect(() => {
    return function () {
      recorderRef.current?.stop(true);
      deinitializeScreenStream();
      deinitializeCameraStream();
      deinitializeMicrophoneStream();
      cleanupRecorder();
    };
  }, [
    deinitializeScreenStream,
    deinitializeCameraStream,
    deinitializeMicrophoneStream,
    cleanupRecorder,
  ]);

  return (
    <div className="recorder">
      <canvas
        aria-label="Recording canvas"
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
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1600 800'%3E%3Cg %3E%3Cpath fill='%2316eaff' d='M486 705.8c-109.3-21.8-223.4-32.2-335.3-19.4C99.5 692.1 49 703 0 719.8V800h843.8c-115.9-33.2-230.8-68.1-347.6-92.2C492.8 707.1 489.4 706.5 486 705.8z'/%3E%3Cpath fill='%231ddaff' d='M1600 0H0v719.8c49-16.8 99.5-27.8 150.7-33.5c111.9-12.7 226-2.4 335.3 19.4c3.4 0.7 6.8 1.4 10.2 2c116.8 24 231.7 59 347.6 92.2H1600V0z'/%3E%3Cpath fill='%231ccaff' d='M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z'/%3E%3Cpath fill='%2315baff' d='M0 0v429.4c55.6-18.4 113.5-27.3 171.4-27.7c102.8-0.8 203.2 22.7 299.3 54.5c3 1 5.9 2 8.9 3c183.6 62 365.7 146.1 562.4 192.1c186.7 43.7 376.3 34.4 557.9-12.6V0H0z'/%3E%3Cpath fill='%2300aaff' d='M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z'/%3E%3Cpath fill='%2336b9ff' d='M1600 0H0v136.3c62.3-20.9 127.7-27.5 192.2-19.2c93.6 12.1 180.5 47.7 263.3 89.6c2.6 1.3 5.1 2.6 7.7 3.9c158.4 81.1 319.7 170.9 500.3 223.2c210.5 61 430.8 49 636.6-16.6V0z'/%3E%3Cpath fill='%234dc8ff' d='M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z'/%3E%3Cpath fill='%235ed8ff' d='M1600 0H498c118.1 85.8 243.5 164.5 386.8 216.2c191.8 69.2 400 74.7 595 21.1c40.8-11.2 81.1-25.2 120.3-41.7V0z'/%3E%3Cpath fill='%236ce8ff' d='M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z'/%3E%3Cpath fill='%2378f8ff' d='M1315.3 72.4c75.3-12.6 148.9-37.1 216.8-72.4h-723C966.8 71 1144.7 101 1315.3 72.4z'/%3E%3C/g%3E%3C/svg%3E"
        alt="bg-pattern"
        style={HIDDEN}
      />
    </div>
  );
}
//
// src="data:image/png;base64,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"
//
// background-color: #cefdff;
// background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 800 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='400' cy='400' r='50%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23cefdff'/%3E%3Cstop offset='1' stop-color='%230EF'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='400' cy='400' r='70%25' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23cefdff'/%3E%3Cstop offset='1' stop-color='%230FF'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='800' height='800'/%3E%3Cg fill-opacity='.8'%3E%3Cpath fill='url(%23b)' d='M998.7 439.2c1.7-26.5 1.7-52.7 0.1-78.5L401 399.9c0 0 0-0.1 0-0.1l587.6-116.9c-5.1-25.9-11.9-51.2-20.3-75.8L400.9 399.7c0 0 0-0.1 0-0.1l537.3-265c-11.6-23.5-24.8-46.2-39.3-67.9L400.8 399.5c0 0 0-0.1-0.1-0.1l450.4-395c-17.3-19.7-35.8-38.2-55.5-55.5l-395 450.4c0 0-0.1 0-0.1-0.1L733.4-99c-21.7-14.5-44.4-27.6-68-39.3l-265 537.4c0 0-0.1 0-0.1 0l192.6-567.4c-24.6-8.3-49.9-15.1-75.8-20.2L400.2 399c0 0-0.1 0-0.1 0l39.2-597.7c-26.5-1.7-52.7-1.7-78.5-0.1L399.9 399c0 0-0.1 0-0.1 0L282.9-188.6c-25.9 5.1-51.2 11.9-75.8 20.3l192.6 567.4c0 0-0.1 0-0.1 0l-265-537.3c-23.5 11.6-46.2 24.8-67.9 39.3l332.8 498.1c0 0-0.1 0-0.1 0.1L4.4-51.1C-15.3-33.9-33.8-15.3-51.1 4.4l450.4 395c0 0 0 0.1-0.1 0.1L-99 66.6c-14.5 21.7-27.6 44.4-39.3 68l537.4 265c0 0 0 0.1 0 0.1l-567.4-192.6c-8.3 24.6-15.1 49.9-20.2 75.8L399 399.8c0 0 0 0.1 0 0.1l-597.7-39.2c-1.7 26.5-1.7 52.7-0.1 78.5L399 400.1c0 0 0 0.1 0 0.1l-587.6 116.9c5.1 25.9 11.9 51.2 20.3 75.8l567.4-192.6c0 0 0 0.1 0 0.1l-537.3 265c11.6 23.5 24.8 46.2 39.3 67.9l498.1-332.8c0 0 0 0.1 0.1 0.1l-450.4 395c17.3 19.7 35.8 38.2 55.5 55.5l395-450.4c0 0 0.1 0 0.1 0.1L66.6 899c21.7 14.5 44.4 27.6 68 39.3l265-537.4c0 0 0.1 0 0.1 0L207.1 968.3c24.6 8.3 49.9 15.1 75.8 20.2L399.8 401c0 0 0.1 0 0.1 0l-39.2 597.7c26.5 1.7 52.7 1.7 78.5 0.1L400.1 401c0 0 0.1 0 0.1 0l116.9 587.6c25.9-5.1 51.2-11.9 75.8-20.3L400.3 400.9c0 0 0.1 0 0.1 0l265 537.3c23.5-11.6 46.2-24.8 67.9-39.3L400.5 400.8c0 0 0.1 0 0.1-0.1l395 450.4c19.7-17.3 38.2-35.8 55.5-55.5l-450.4-395c0 0 0-0.1 0.1-0.1L899 733.4c14.5-21.7 27.6-44.4 39.3-68l-537.4-265c0 0 0-0.1 0-0.1l567.4 192.6c8.3-24.6 15.1-49.9 20.2-75.8L401 400.2c0 0 0-0.1 0-0.1L998.7 439.2z'/%3E%3C/g%3E%3C/svg%3E");
// background-attachment: fixed;
// background-size: cover;
//

// background-color: #59e5f2;
// background-image: url("");

function imageCoverCoordinates(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetLeft: number = 0.5,
  offsetTop: number = 0.5
): {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
} {
  const contentRatio = imageWidth / imageHeight;
  const containerRatio = canvasWidth / canvasHeight;

  const resultHeight = contentRatio > containerRatio ? canvasHeight : canvasWidth / contentRatio;
  const resultWidth = contentRatio > containerRatio ? canvasHeight * contentRatio : canvasWidth;

  return {
    width: resultWidth,
    height: resultHeight,
    offsetLeft: (canvasWidth - resultWidth) * offsetLeft,
    offsetTop: (canvasHeight - resultHeight) * offsetTop,
  };
}
