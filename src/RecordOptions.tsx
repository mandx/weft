import React, { useState, useCallback } from 'react';
import { ReactComponent as GearIcon } from 'bootstrap-icons/icons/gear.svg';
import { ReactComponent as GearFillIcon } from 'bootstrap-icons/icons/gear-fill.svg';
import { ReactComponent as CameraReelsIcon } from 'bootstrap-icons/icons/camera-reels.svg';
import { ReactComponent as CameraReelsFillIcon } from 'bootstrap-icons/icons/camera-reels-fill.svg';
import { ReactComponent as WindowIcon } from 'bootstrap-icons/icons/window.svg';
import { ReactComponent as CameraVideoIcon } from 'bootstrap-icons/icons/camera-video.svg';
import { ReactComponent as MicIcon } from 'bootstrap-icons/icons/mic.svg';

import { Quality } from './app-types';
import FullscreenToggle from './FullscreenToggle';

import './RecordOptions.scss';

export enum MediaAccess {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Error = 'ERROR',
  Denied = 'DENIED',
}

export interface RecordingOptionsProps {
  quality?: Quality;
  onChangeQuality?: (quality: Quality) => void;

  screenAccess?: MediaAccess;
  requestScreenAccess?: (access: MediaAccess) => void;

  cameraAccess?: MediaAccess;
  requestCameraAccess?: (access: MediaAccess) => void;

  microphoneAccess?: MediaAccess;
  requestMicrophoneAccess?: (access: MediaAccess) => void;

  recording?: boolean;
  toggleRecording?: () => void;
}

function negate(b: boolean): boolean {
  return !b;
}

export default function RecordOptions({
  quality,
  onChangeQuality,

  screenAccess,
  requestScreenAccess,

  cameraAccess,
  requestCameraAccess,

  microphoneAccess,
  requestMicrophoneAccess,

  recording,
  toggleRecording,
}: RecordingOptionsProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const optionsClicked = useCallback(() => {
    setExpanded(negate);
  }, [setExpanded]);

  const selectQuality = useCallback(
    function changeQualityCb(event: React.ChangeEvent<HTMLSelectElement>): void {
      const { value } = event.target;
      switch (value) {
        case '720p': {
          onChangeQuality?.(value);
          break;
        }
        case '1080p': {
          onChangeQuality?.(value);
          break;
        }
      }
    },
    [onChangeQuality]
  );

  return (
    <div className={`recording-actions ${expanded ? 'expanded' : ''}`}>
      <div className="toolbar">
        <button className="recording" onClick={toggleRecording}>
          {recording ? <CameraReelsIcon /> : <CameraReelsFillIcon />}
          {recording ? 'Stop recording' : 'Start recording'}
        </button>
        <button className="recording-options" title="Recording options" onClick={optionsClicked}>
          {expanded ? <GearIcon /> : <GearFillIcon />}
          Options
        </button>
        <FullscreenToggle />
      </div>
      <ul className="recording-options-menu">
        <li>
          <label>
          Quality
          <select name="quality" value={quality} onChange={selectQuality}>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
          </label>
        </li>
        {!!screenAccess && (
          <li>
            <label>
              <WindowIcon />
              <input
                type="checkbox"
                name="include-screen"
                className="include-screen"
                checked={screenAccess === MediaAccess.Active}
                disabled={
                  !requestScreenAccess ||
                  screenAccess === MediaAccess.Denied ||
                  screenAccess === MediaAccess.Error
                }
                onChange={
                  requestScreenAccess &&
                  ((event) => {
                    const access = event.currentTarget.checked
                      ? MediaAccess.Active
                      : MediaAccess.Inactive;
                    requestScreenAccess(access);
                  })
                }
              />
              Include screen
            </label>
          </li>
        )}
        {!!cameraAccess && (
          <li>
            <label>
              <CameraVideoIcon />
              <input
                type="checkbox"
                name="include-camera"
                className="include-camera"
                checked={cameraAccess === MediaAccess.Active}
                disabled={
                  !requestCameraAccess ||
                  cameraAccess === MediaAccess.Denied ||
                  cameraAccess === MediaAccess.Error
                }
                onChange={
                  requestCameraAccess &&
                  ((event) => {
                    const access = event.currentTarget.checked
                      ? MediaAccess.Active
                      : MediaAccess.Inactive;
                    requestCameraAccess(access);
                  })
                }
              />
              Include camera
            </label>
          </li>
        )}
        <li>
          <label>
            <MicIcon />
            <input
              type="checkbox"
              name="include-microphone"
              className="include-microphone"
              checked={microphoneAccess === MediaAccess.Active}
              disabled={
                !requestMicrophoneAccess ||
                microphoneAccess === MediaAccess.Denied ||
                microphoneAccess === MediaAccess.Error
              }
              onChange={
                requestMicrophoneAccess &&
                ((event) => {
                  const access = event.currentTarget.checked
                    ? MediaAccess.Active
                    : MediaAccess.Inactive;
                  requestMicrophoneAccess(access);
                })
              }
            />
            Include microphone
          </label>
        </li>
      </ul>
    </div>
  );
}
