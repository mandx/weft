import React, { useState, useCallback } from 'react';
import { ReactComponent as GearIcon } from 'bootstrap-icons/icons/gear.svg';
import { ReactComponent as GearFillIcon } from 'bootstrap-icons/icons/gear-fill.svg';
import { ReactComponent as CameraReelsIcon } from 'bootstrap-icons/icons/camera-reels.svg';
import { ReactComponent as CameraReelsFillIcon } from 'bootstrap-icons/icons/camera-reels-fill.svg';
import { ReactComponent as WindowIcon } from 'bootstrap-icons/icons/window.svg';
import { ReactComponent as CameraVideoIcon } from 'bootstrap-icons/icons/camera-video.svg';
import { ReactComponent as MicIcon } from 'bootstrap-icons/icons/mic.svg';

import FullscreenToggle from './FullscreenToggle';
import './RecordOptions.scss';

export type Quality = '720p' | '1080p';
export type Resolution = [number, number];

export const DEFAULT_RESOLUTION: Resolution = [1280, 720];

export function qualityToResolution(quality: unknown, defaultResolution: Resolution): Resolution {
  switch (quality) {
    case '720p': {
      return [1280, 720];
    }
    case '1080p': {
      return [1920, 1080];
    }
  }
  return defaultResolution;
}

export type MediaAccess = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'DENIED';

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
  }, []);

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
    <div className="recording-actions">
      <button className="recording" onClick={toggleRecording}>
        {recording ? (
          <CameraReelsIcon role="presentation" />
        ) : (
          <CameraReelsFillIcon role="presentation" />
        )}
        {recording ? 'Stop recording' : 'Start recording'}
      </button>
      <div className={`recording-options-container ${expanded ? 'expanded' : ''}`}>
        <button className="recording-options" title="Recording options" onClick={optionsClicked}>
          {expanded ? <GearIcon role="presentation" /> : <GearFillIcon role="presentation" />}
          Options
        </button>
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
                <WindowIcon role="presentation" />
                <input
                  type="checkbox"
                  name="include-screen"
                  className="include-screen"
                  checked={screenAccess === 'ACTIVE'}
                  disabled={
                    !requestScreenAccess || screenAccess === 'DENIED' || screenAccess === 'ERROR'
                  }
                  onChange={
                    requestScreenAccess &&
                    ((event) => {
                      const access = event.currentTarget.checked ? 'ACTIVE' : 'INACTIVE';
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
                <CameraVideoIcon role="presentation" />
                <input
                  type="checkbox"
                  name="include-camera"
                  className="include-camera"
                  checked={cameraAccess === 'ACTIVE'}
                  disabled={
                    !requestCameraAccess || cameraAccess === 'DENIED' || cameraAccess === 'ERROR'
                  }
                  onChange={
                    requestCameraAccess &&
                    ((event) => {
                      const access = event.currentTarget.checked ? 'ACTIVE' : 'INACTIVE';
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
              <MicIcon role="presentation" />
              <input
                type="checkbox"
                name="include-microphone"
                className="include-microphone"
                checked={microphoneAccess === 'ACTIVE'}
                disabled={
                  !requestMicrophoneAccess ||
                  microphoneAccess === 'DENIED' ||
                  microphoneAccess === 'ERROR'
                }
                onChange={
                  requestMicrophoneAccess &&
                  ((event) => {
                    const access = event.currentTarget.checked ? 'ACTIVE' : 'INACTIVE';
                    requestMicrophoneAccess(access);
                  })
                }
              />
              Include microphone
            </label>
          </li>
        </ul>
      </div>
      <FullscreenToggle />
    </div>
  );
}
