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
import { mediaAccessToMediaPreference, MediaPreferences } from './runtypes';
import { loadFromLocalStorage, saveToLocalStorage } from './utilities';

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
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const screenStream: MutableRefObject<MediaStream | null> = useRef(null);
  const cameraStream: MutableRefObject<MediaStream | null> = useRef(null);
  const microphoneStream: MutableRefObject<MediaStream | null> = useRef(null);

  const thumbnailRef = useRef<Blob | undefined>(undefined);
  const imagePatternRef = useRef<HTMLImageElement>(null);

  /*
   * requestAnimationFrame loop state
   */
  const frameRequestContinue: MutableRefObject<boolean> = useRef(false);
  const lastFrameTimestamp: MutableRefObject<ReturnType<typeof performance.now>> = useRef(0);

  /** This needs to be kept in sync with the `recording` state variable */
  const recorderRef: MutableRefObject<MediaRecorderWrapper | null> = useRef(null);
  /** This needs to be kept in sync with `recorderRef` */
  const [recording, setRecording] = useState<boolean>(false);

  const [quality, setQuality] = useState<Quality>('720p');
  const [screenAccess, setScreenAccess] = useState<MediaAccess>('INACTIVE');
  const [cameraAccess, setCameraAccess] = useState<MediaAccess>('INACTIVE');
  const [microphoneAccess, setMicrophoneAccess] = useState<MediaAccess>('INACTIVE');
  const [mediaPreferences, setMediaPreferences] = useState<ReturnType<typeof MediaPreferences>>({
    screen: 'ACTIVE',
    camera: 'ACTIVE',
    microphone: 'ACTIVE',
  });

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
      if (!canvas) {
        console.warn('No canvas element found; aborting render iteration.');
        return;
      }
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      const context = canvas.getContext('2d');
      if (!context) {
        console.warn('No 2D context obtained; aborting render iteration.');
        return;
      }

      // NOTE: This is affected by transformations
      context.clearRect(0, 0, canvasWidth, canvasHeight);

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

      const screenVideo = screenVideoRef.current;
      if (
        screenVideo &&
        screenVideo.srcObject instanceof MediaStream &&
        screenVideo.srcObject.active
      ) {
        const screenVideoWidth = screenVideo.videoWidth || 640;
        const screenVideoHeight = screenVideo.videoHeight || 480;
        const ratio = Math.min(canvasWidth / screenVideoWidth, canvasHeight / screenVideoHeight);
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
      //     lastFrameTimestamp: lastFrameTimestamp.current,
      //     'cameraVideo.srcObject.active': !!(cameraVideo as any)?.srcObject?.active,
      //   },
      //   undefined,
      //   2
      // );
      // context.font = 'bold 20px sans-serif';
      // context.fillStyle = 'blue';
      // context.fillText(text, 5, 30);
    },
    []
  );

  const toggleRecording = useCallback(
    function toggleRecordingCb() {
      const recorder = recorderRef.current;
      if (recorder) {
        console.log('Stopping recording');
        recorderRef.current = null;
        recorder.stop().then((blob) => {
          onNewRecording(
            new Recording(
              createMemoryBlobResolver(blob),
              createMemoryBlobResolver(thumbnailRef.current || new Blob())
            )
          );
        });
        setRecording(false);
        onRecordingStateChange('STOPPED');
      } else {
        const tracks: MediaStreamTrack[] = [];
        const audioTracks = microphoneStream.current?.getAudioTracks() || [];
        if (microphoneAccess === 'ACTIVE' && !audioTracks.length) {
          console.error('microphoneAccess === "ACTIVE" but got no audio tracks.', {
            'microphoneStream.current': !!microphoneStream.current,
            'audioTracks.length': audioTracks.length,
          });
        }
        tracks.push(...audioTracks);

        const canvas = canvasRef.current;
        if (canvas) {
          canvas.toBlob((blob) => {
            thumbnailRef.current = blob || undefined;
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

  const requestScreenAccess = useCallback(
    function requestScreenAccessCb(access: MediaAccess): void {
      setMediaPreferences((prefs) => ({
        ...prefs,
        screen: mediaAccessToMediaPreference(access),
      }));
      if (access === 'ACTIVE') {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((stream) => {
            screenStream.current = stream;
            setScreenAccess('ACTIVE');
            stream.addEventListener('inactive', screenStreamEnded);

            const screenVideoEl = screenVideoRef.current;
            if (screenVideoEl) {
              screenVideoEl.src = '';
              screenVideoEl.srcObject = stream;
              screenVideoEl.play();
            }
          })
          .catch((error) => {
            console.warn('Error accessing screen stream:', `${error.message} (${error.name})`);
            setScreenAccess(
              ['NotAllowedError', 'InvalidStateError'].includes((error as Error).name)
                ? 'INACTIVE'
                : 'ERROR'
            );

            switch (error.name) {
              case 'NotAllowedError': {
                emitNotification(`Screen access cancelled`, 'info');
                break;
              }

              case 'InvalidStateError': {
                emitNotification(
                  `To have screen access, you need to interact with the page first.`,
                  'info'
                );
                break;
              }

              default: {
                emitNotification(
                  `Error accessing screen: ${error.message} (${error.name})`,
                  'error'
                );
                break;
              }
            }
          });
      } else if (access === 'INACTIVE') {
        deinitializeScreenStream();
        setScreenAccess('INACTIVE');
      }
    },
    [screenStreamEnded, deinitializeScreenStream, emitNotification]
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
        track.stop();
        recorderStream?.removeTrack(track);
      });

      const cameraVideo = cameraVideoRef.current;
      if (cameraVideo) {
        cameraVideo.src = '';
        cameraVideo.srcObject = null;
      }
    },
    [cameraStreamEnded]
  );

  const requestCameraAccess = useCallback(
    function requestCameraAccessCb(access: MediaAccess): void {
      setMediaPreferences((prefs) => ({ ...prefs, camera: mediaAccessToMediaPreference(access) }));
      if (access === 'ACTIVE') {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then((stream) => {
            cameraStream.current = stream;
            setCameraAccess('ACTIVE');
            stream.addEventListener('inactive', cameraStreamEnded);

            const cameraVideoEl = cameraVideoRef.current;
            if (cameraVideoEl) {
              cameraVideoEl.src = '';
              cameraVideoEl.srcObject = stream;
              cameraVideoEl.play();
            }
          })
          .catch((error) => {
            console.warn('Error accessing camera stream:', `${error.message} (${error.name})`);
            setCameraAccess(
              ['NotAllowedError', 'InvalidStateError'].includes((error as Error).name)
                ? 'INACTIVE'
                : 'ERROR'
            );

            switch (error.name) {
              case 'NotAllowedError': {
                emitNotification(`Camera access cancelled`, 'info');
                break;
              }

              case 'InvalidStateError': {
                emitNotification(
                  `To have camera access, you need to interact with the page first.`,
                  'info'
                );
                break;
              }

              default: {
                emitNotification(
                  `Error accessing camera: ${error.message} (${error.name})`,
                  'error'
                );
                break;
              }
            }
          });
      } else if (access === 'INACTIVE') {
        deinitializeCameraStream();
        setCameraAccess('INACTIVE');
      }
    },
    [cameraStreamEnded, deinitializeCameraStream, emitNotification]
  );

  const microphoneStreamEnded = useCallback(function microphoneStreamEndedCb() {
    microphoneStream.current = null;
    setMicrophoneAccess('INACTIVE');
  }, []);

  const deinitializeMicrophoneStream = useCallback(
    function deinitializeMicrophoneStreamCb() {
      console.log('deinitializeMicrophoneStreamCb');
      const recorderStream = recorderRef.current?.stream;

      microphoneStream.current?.removeEventListener('inactive', microphoneStreamEnded);
      microphoneStream.current?.getTracks().forEach((track) => {
        recorderStream?.removeTrack(track);
        track.stop();
      });
    },
    [microphoneStreamEnded]
  );

  const requestMicrophoneAccess = useCallback(
    function requestMicrophoneAccessCb(access: MediaAccess): void {
      setMediaPreferences((prefs) => ({
        ...prefs,
        microphone: mediaAccessToMediaPreference(access),
      }));
      if (access === 'ACTIVE') {
        navigator.mediaDevices
          .getUserMedia({
            video: false,
            audio: { echoCancellation: true, noiseSuppression: true },
          })
          .then((stream) => {
            console.log(
              'got microphone stream',
              stream.active,
              stream.id,
              stream.getAudioTracks().length,
              stream.getTracks().length
            );
            microphoneStream.current = stream;
            setMicrophoneAccess('ACTIVE');
            stream.addEventListener('inactive', microphoneStreamEnded);
          })
          .catch((error) => {
            console.warn('Error accessing microphone stream:', `${error.message} (${error.name})`);
            setMicrophoneAccess(
              ['NotAllowedError', 'InvalidStateError'].includes((error as Error).name)
                ? 'INACTIVE'
                : 'ERROR'
            );

            switch (error.name) {
              case 'NotAllowedError': {
                emitNotification(`Microphone access cancelled`, 'info');
                break;
              }

              case 'InvalidStateError': {
                emitNotification(
                  `To have microphone access, you need to interact with the page first.`,
                  'info'
                );
                break;
              }

              default: {
                emitNotification(
                  `Error accessing microphone: ${error.message} (${error.name})`,
                  'error'
                );
                break;
              }
            }
          });
      } else if (access === 'INACTIVE') {
        deinitializeMicrophoneStream();
        setMicrophoneAccess('INACTIVE');
      }
    },
    [microphoneStreamEnded, deinitializeMicrophoneStream, emitNotification]
  );

  const cleanupRecorder = useCallback(function cleanupRecorderCb() {
    const recorderStream = recorderRef.current?.stream;
    recorderStream?.getTracks().forEach((track) => {
      console.warn('Track ', track.id, 'was not cleaned up...');
      recorderStream.removeTrack(track);
      track.stop();
    });
  }, []);

  useEffect(
    function startRenderLoop() {
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
        frameRequestContinue.current = true;
        composeFrames();
      }

      return function stopRenderLoop() {
        frameRequestContinue.current = false;
      };
    },
    [composeFrames]
  );

  useEffect(
    function deinitializeRecorderAndStreamsOnUnmount() {
      return function deinitializeRecorderAndStreams() {
        recorderRef.current?.stop(true);
        deinitializeScreenStream();
        deinitializeCameraStream();
        deinitializeMicrophoneStream();
        cleanupRecorder();
      };
    },
    [
      deinitializeScreenStream,
      deinitializeCameraStream,
      deinitializeMicrophoneStream,
      cleanupRecorder,
    ]
  );

  const mediaPrefsRead = useRef(false);
  useEffect(
    function readAndSaveStreamPrefs() {
      if (mediaPrefsRead.current) {
        return;
      }
      mediaPrefsRead.current = true;

      const prefs = loadFromLocalStorage('media-preferences', MediaPreferences, mediaPreferences);

      if (prefs.screen === 'ACTIVE' && prefs.screen !== screenAccess) {
        requestScreenAccess(prefs.screen);
      }
      if (prefs.camera === 'ACTIVE' && prefs.camera !== cameraAccess) {
        requestCameraAccess(prefs.camera);
      }
      if (prefs.microphone === 'ACTIVE' && prefs.microphone !== microphoneAccess) {
        requestMicrophoneAccess(prefs.microphone);
      }

      return function saveStreamPrefs() {
        saveToLocalStorage('media-preferences', mediaPreferences);
      };
    },
    [
      mediaPreferences,
      screenAccess,
      cameraAccess,
      microphoneAccess,
      requestScreenAccess,
      requestCameraAccess,
      requestMicrophoneAccess,
    ]
  );

  const [resolutionWidth, resolutionHeight] = qualityToResolution(quality, DEFAULT_RESOLUTION);

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
      <img
        ref={imagePatternRef}
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1600 800'%3E%3Cg %3E%3Cpath fill='%2316eaff' d='M486 705.8c-109.3-21.8-223.4-32.2-335.3-19.4C99.5 692.1 49 703 0 719.8V800h843.8c-115.9-33.2-230.8-68.1-347.6-92.2C492.8 707.1 489.4 706.5 486 705.8z'/%3E%3Cpath fill='%231ddaff' d='M1600 0H0v719.8c49-16.8 99.5-27.8 150.7-33.5c111.9-12.7 226-2.4 335.3 19.4c3.4 0.7 6.8 1.4 10.2 2c116.8 24 231.7 59 347.6 92.2H1600V0z'/%3E%3Cpath fill='%231ccaff' d='M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z'/%3E%3Cpath fill='%2315baff' d='M0 0v429.4c55.6-18.4 113.5-27.3 171.4-27.7c102.8-0.8 203.2 22.7 299.3 54.5c3 1 5.9 2 8.9 3c183.6 62 365.7 146.1 562.4 192.1c186.7 43.7 376.3 34.4 557.9-12.6V0H0z'/%3E%3Cpath fill='%2300aaff' d='M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z'/%3E%3Cpath fill='%2336b9ff' d='M1600 0H0v136.3c62.3-20.9 127.7-27.5 192.2-19.2c93.6 12.1 180.5 47.7 263.3 89.6c2.6 1.3 5.1 2.6 7.7 3.9c158.4 81.1 319.7 170.9 500.3 223.2c210.5 61 430.8 49 636.6-16.6V0z'/%3E%3Cpath fill='%234dc8ff' d='M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z'/%3E%3Cpath fill='%235ed8ff' d='M1600 0H498c118.1 85.8 243.5 164.5 386.8 216.2c191.8 69.2 400 74.7 595 21.1c40.8-11.2 81.1-25.2 120.3-41.7V0z'/%3E%3Cpath fill='%236ce8ff' d='M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z'/%3E%3Cpath fill='%2378f8ff' d='M1315.3 72.4c75.3-12.6 148.9-37.1 216.8-72.4h-723C966.8 71 1144.7 101 1315.3 72.4z'/%3E%3C/g%3E%3C/svg%3E"
        alt="bg-pattern"
        style={HIDDEN}
      />
    </div>
  );
}

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
