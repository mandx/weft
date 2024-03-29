import React, { useState, useCallback } from 'react';
import { ReactComponent as GearIcon } from 'bootstrap-icons/icons/gear.svg';
import { ReactComponent as GearFillIcon } from 'bootstrap-icons/icons/gear-fill.svg';
import { ReactComponent as CameraReelsIcon } from 'bootstrap-icons/icons/camera-reels.svg';
import { ReactComponent as CameraReelsFillIcon } from 'bootstrap-icons/icons/camera-reels-fill.svg';
import { ReactComponent as WindowIcon } from 'bootstrap-icons/icons/window.svg';
import { ReactComponent as CameraVideoIcon } from 'bootstrap-icons/icons/camera-video.svg';
import { ReactComponent as MicIcon } from 'bootstrap-icons/icons/mic.svg';

import { classnames } from './utilities';
import FullscreenToggle from './FullscreenToggle';
import './RecordOptions.scss';

export type Quality = '720p' | '1080p';

/**
 * A [width: number, height: number] tuple
 */
export type Resolution = [number, number];

export const DEFAULT_RESOLUTION: Resolution = [1280, 720];

/**
 * Try to return a resolution from a given `quality`
 */
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

/**
 * Enum indicating the current state of a media stream.
 *
 * 'ACTIVE': Media currently in use
 * 'INACTIVE': Media not in use
 * 'ERROR': Error accessing media stream
 * 'DENIED': User denied access to the stream - (NOTE: Is this really used?)
 */
export type MediaAccess = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'DENIED';

export interface RecordingOptionsProps {
  /**
   * Selected quality setting
   */
  readonly quality?: Quality;
  /**
   * Callback triggered when a new quality setting is selected
   */
  readonly onChangeQuality?: (quality: Quality) => void;

  /**
   * Access status of the screen stream
   */
  readonly screenAccess?: MediaAccess;
  /**
   * Callback triggered access to the screen is requested or deactivated
   */
  readonly requestScreenAccess?: (access: MediaAccess) => void;

  /**
   * Access status of the camera stream
   */
  readonly cameraAccess?: MediaAccess;
  /**
   * Callback triggered access to the camera is requested or deactivated
   */
  readonly requestCameraAccess?: (access: MediaAccess) => void;

  /**
   * Access status of the microphone stream
   */
  readonly microphoneAccess?: MediaAccess;
  /**
   * Callback triggered access to the microphone is requested or deactivated
   */
  readonly requestMicrophoneAccess?: (access: MediaAccess) => void;

  /**
   * Indicates if recording is in progress or not
   */
  readonly recording?: boolean;
  /**
   * Callback triggered when recording is to be started or stopped
   */
  readonly toggleRecording?: () => void;
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
    <div className="recording-actions-wrapper">
      <div className="recording-actions">
        <button className="btn recording" onClick={toggleRecording}>
          <span className="btn-icon">
            {recording ? (
              <CameraReelsIcon role="presentation" />
            ) : (
              <CameraReelsFillIcon role="presentation" />
            )}
          </span>
          <span className="btn-text">{recording ? 'Stop recording' : 'Start recording'}</span>
        </button>
        <div className={classnames('recording-options-container', expanded && 'expanded')}>
          <button
            className="btn recording-options"
            title="Recording options"
            onClick={optionsClicked}
          >
            <span className="btn-icon">
              {expanded ? <GearIcon role="presentation" /> : <GearFillIcon role="presentation" />}
            </span>
            <span className="btn-text">Options</span>
          </button>
          <ul className="recording-options-menu">
            <li>
              <label>
                Quality
                <select className="btn" name="quality" value={quality} onChange={selectQuality}>
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
    </div>
  );
}
