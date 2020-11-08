import React, { Fragment, useState, useCallback } from 'react';
import { ReactComponent as XCircleIcon } from 'bootstrap-icons/icons/x-circle-fill.svg';

import './App.scss';
import Recorder from './Recorder';
import RecordingsList, { Recording } from './RecordingsList';
import Notifications, { createNotificationsEmitter } from './Notifications';
import Modal from './Modal';
import Tour, { TourCallBackProps } from './Tour';
import { useConstant } from './hooks';

const TOUR_STEPS: React.ComponentProps<typeof Tour>['steps'] = [
  {
    target: '.main-nav .main-header',
    content: (
      <Fragment>
        <strong>Welcome to Weft!</strong>
        <p>
          This is a experimental web tool that allows you to record yourself and your screen
          simultaneously using only a modern browser.
        </p>
      </Fragment>
    ),
  },
  {
    target: '.recording-actions .recording-options-container',
    content: 'Use this menu to configure your recording.',
  },
  {
    target: '.recording-actions .recording',
    content: 'Use this button to initiate the recording',
  },
];

export default function App() {
  const notificationsEmitter = useConstant(createNotificationsEmitter);
  const runTour = useConstant(
    () =>
      !(['finished', 'ready'] as (string | null)[]).includes(
        localStorage.getItem('weft.tour.status')
      )
  );

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [playing, setPlaying] = useState<Recording | undefined>(undefined);

  const addNewRecording = useCallback(function addNewDownloadUrlCb(
    recording: Recording
  ): void {
    setRecordings((recordings) => [recording, ...recordings]);
  },
  []);

  const setRecordingsList = useCallback(function setDownloadListCb(newList: Recording[]): void {
    setRecordings((currentList) => {
      // We need to revoke in-memory blob URLs that might have been deleted
      const pickUrl = (item: Recording) => item.url;

      const oldUrls = new Set(currentList.map(pickUrl));
      Array.from(new Set(newList.map(pickUrl).filter((url) => !oldUrls.has(url)))).forEach(
        URL.revokeObjectURL
      );

      return newList;
    });
  }, []);

  const playVideo = useCallback(function playVideoCb<T>(
    recording: Recording,
    event: React.MouseEvent<T>
  ): void {
    if (event.ctrlKey) {
      window.open(recording.url, '_blank');
    } else {
      setPlaying(recording);
    }
  },
  []);

  const closeVideoPlayer = useCallback(function closeVideoPlayerCb() {
    setPlaying(undefined);
  }, []);

  React.useEffect(() => {
    Object.assign(window, { emitNotification: notificationsEmitter.emit })
  }, [notificationsEmitter.emit]);

  const tourCallback = useCallback(function tourStateCb({ status }: TourCallBackProps) {
    localStorage.setItem('weft.tour.status', status);
  }, []);

  return (
    <Fragment>
      <Tour
        steps={TOUR_STEPS}
        continuous
        run={runTour}
        showProgress
        showSkipButton
        callback={tourCallback}
      />
      <nav className="main-nav">
        <header className="main-header">
          <h1>Weft</h1>
        </header>
        <RecordingsList
          recordings={recordings}
          onEditRecordings={setRecordingsList}
          onPlayRecording={playVideo}
        />
      </nav>
      <Recorder onNewRecording={addNewRecording} emitNotification={notificationsEmitter.emit} />
      {!!playing && (
        <Modal className="preview-video-player-modal" open onClose={closeVideoPlayer}>
          <button
            className="preview-video-player-close"
            title="Close player"
            type="button"
            onClick={closeVideoPlayer}>
            <XCircleIcon role="presentation" />
          </button>

          <video
            src={playing.url}
            className="preview-video-player"
            controls
          />
        </Modal>
      )}
      <Notifications emitter={notificationsEmitter} />
    </Fragment>
  );
}
