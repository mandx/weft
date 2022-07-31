import { useCallback, useEffect } from 'react';
import { ReactComponent as WebcamFillIcon } from 'bootstrap-icons/icons/webcam-fill.svg';

import './App.scss';
import Recorder from './Recorder';
import Recording from './Recording';
import Homescreen from './Homescreen';
import Notifications, { createNotificationsEmitter } from './Notifications';
import { useConstant, useDynamicStylesheet } from './hooks';
import { createHistory, Fallback, Link, Route, Router, Switch } from './Router';
import { useRecordings, useStorageEstimate } from './storage-swr';
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
  const history = useConstant(createHistory);
  const recordings = useRecordings();
  const storageEstimate = useStorageEstimate();

  const addNewRecording = useCallback(
    function addNewDownloadUrlCb(recording: Recording): void {
      recordings.add([recording]);
      history.push('/');
    },
    [history, recordings]
  );

  const historyGoBack = useCallback(
    function historyGoBackCb() {
      history.back();
    },
    [history]
  );

  const selectedAppBackground = useCallback(function appBgHandler(background: AppBackground) {
    applyBackgroundToStylesheet(background, backgroundsStylesheet);
    saveToLocalStorage('selected-app-background', background);
  }, [backgroundsStylesheet]);

  useEffect(function loadSavedAppBg() {
    try {
      applyBackgroundToStylesheet(
        loadFromLocalStorage('selected-app-background', AppBackgroundRuntype),
        backgroundsStylesheet
      );
    } catch (error) {
      console.info('Error loading app background', `${error}`);
    }
  }, [backgroundsStylesheet]);

  useEffect(
    function exposeNotifications() {
      Object.assign(window, { emitNotification: notificationsEmitter.emit });
    },
    [notificationsEmitter.emit]
  );

  const onPlayRecording = useCallback(
    function handlePlayRecording(recording: Readonly<Recording>): void {
      history.push(`/play/${recording.databaseId}`);
    },
    [history]
  );

  return (
    <Router history={history}>
      <nav className="main-nav">
        <header className="main-header">
          <h1>
            <Link to="/" className="start-page-link btn">
              <WebcamFillIcon className="btn-icon" width={35} height={35} />
              <span className="btn-text">Weft</span>
            </Link>
          </h1>
        </header>
      </nav>
      <Switch>
        <Route route="/record">
          <Recorder
            onNewRecording={addNewRecording}
            emitNotification={notificationsEmitter.emit}
            onRecordingStateChange={noop}
          />
        </Route>
        <Route route="/play/:recordingId">
          <RecordingPlayer />
        </Route>
        <Route route="/play/:recordingId/edit">
          <RecordingPlayer editMode />
        </Route>
        <Route route="/about">
          <AboutPage onCancel={historyGoBack}>
            {storageEstimate.status === 'loaded' && (
              <StorageEstimateBar estimate={storageEstimate.estimate} />
            )}
          </AboutPage>
        </Route>
        <Route route="/settings">
          <Settings onCancel={historyGoBack} onSelectedAppBackground={selectedAppBackground} />
        </Route>
        <Fallback>
          <Homescreen
            storageEstimate={
              storageEstimate.status === 'loaded' ? storageEstimate.estimate : undefined
            }
            onPlayRecording={onPlayRecording}
          />
        </Fallback>
      </Switch>
      <Notifications emitter={notificationsEmitter} />
    </Router>
  );
}
