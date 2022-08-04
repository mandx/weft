import { useCallback, useEffect } from 'react';
import { ReactComponent as WebcamFillIcon } from 'bootstrap-icons/icons/webcam-fill.svg';

import './App.scss';
import Recorder from './Recorder';
import Recording from './Recording';
import Homescreen from './Homescreen';
import Notifications, { createNotificationsEmitter } from './Notifications';
import { useConstant, useDynamicStylesheet } from './hooks';
import { createHistory, PathHistory, Fallback, Link, Route, Router } from './Router';
import * as paths from './app-routes';
import { useRecordings } from './storage-swr';
import RecordingPlayer from './RecordingPlayer';
import AboutPage from './AboutPage';
import StorageEstimateBar from './StorageEstimateBar';
import Settings from './Settings';
import { AppBackground, applyBackgroundToStylesheet } from './app-backgrounds';
import { noop, loadFromLocalStorage, saveToLocalStorage } from './utilities';
import { AppBackground as AppBackgroundRuntype } from './runtypes';

export default function App() {
  const backgroundsStylesheet = useDynamicStylesheet();
  const notificationsEmitter = useConstant(createNotificationsEmitter);
  const history = useConstant(() => new PathHistory(createHistory()));
  const recordings = useRecordings();

  const addNewRecording = useCallback(
    function addNewDownloadUrlCb(recording: Recording): void {
      recordings.add([recording]);
      history.push(paths.index, undefined);
    },
    [history, recordings]
  );

  const historyGoBack = useCallback(
    function historyGoBackCb() {
      history.back();
    },
    [history]
  );

  const selectedAppBackground = useCallback(
    function appBgHandler(background: AppBackground) {
      applyBackgroundToStylesheet(background, backgroundsStylesheet);
      saveToLocalStorage('selected-app-background', background);
    },
    [backgroundsStylesheet]
  );

  const handleRouteNotMatched = useCallback(
    function (route: string): void {
      notificationsEmitter.emit(
        <>
          The URL <code>{route}</code> was not found or understood!
        </>,
        'warn'
      );
    },
    [notificationsEmitter]
  );

  useEffect(
    function loadSavedAppBg() {
      try {
        applyBackgroundToStylesheet(
          loadFromLocalStorage('selected-app-background', AppBackgroundRuntype),
          backgroundsStylesheet
        );
      } catch (error) {
        console.info('Error loading app background', `${error}`);
      }
    },
    [backgroundsStylesheet]
  );

  useEffect(
    function exposeNotifications() {
      Object.assign(window, { emitNotification: notificationsEmitter.emit });
    },
    [notificationsEmitter.emit]
  );

  const onPlayRecording = useCallback(
    function handlePlayRecording(recording: Readonly<Recording>): void {
      history.push(paths.recordingPlay, { recordingId: recording.databaseId });
    },
    [history]
  );

  return (
    <Router history={history}>
      <nav className="main-nav">
        <header className="main-header">
          <h1>
            <Link path={paths.index} className="start-page-link btn">
              <WebcamFillIcon className="btn-icon" width={35} height={35} />
              <span className="btn-text">Weft</span>
            </Link>
          </h1>
        </header>
      </nav>
      <Route path={paths.record}>
        <Recorder
          onNewRecording={addNewRecording}
          emitNotification={notificationsEmitter.emit}
          onRecordingStateChange={noop}
        />
      </Route>
      <Route path={paths.recordingPlay}>
        <RecordingPlayer />
      </Route>
      <Route path={paths.recordingEdit}>
        <RecordingPlayer editMode />
      </Route>
      <Route path={paths.about}>
        <AboutPage onCancel={historyGoBack}>
          <StorageEstimateBar />
        </AboutPage>
      </Route>
      <Route path={paths.settings}>
        <Settings onCancel={historyGoBack} onSelectedAppBackground={selectedAppBackground} />
      </Route>
      <Fallback onRouteNotMatched={handleRouteNotMatched}>
        <Homescreen onPlayRecording={onPlayRecording} />
      </Fallback>
      <Notifications emitter={notificationsEmitter} />
    </Router>
  );
}
