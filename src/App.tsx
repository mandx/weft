import { useCallback, useEffect } from 'react';
import { ReactComponent as WebcamFillIcon } from 'bootstrap-icons/icons/webcam-fill.svg';

import './App.scss';
import Recorder from './Recorder';
import Recording from './Recording';
import Homescreen from './Homescreen';
import Notifications, { createNotificationsEmitter } from './Notifications';
import { useConstant } from './hooks';
import { createHistory, Fallback, Link, Route, Router, Switch } from './Router';
import { useRecordingsStorage, RecordingsStorageContext } from './storage';
import RecordingPlayer from './RecordingPlayer';
import AboutPage from './AboutPage';
import StorageEstimateBar from './StorageEstimateBar';
import Settings from './Settings';
import { AppBackground, applyBackground } from './app-backgrounds';
import { noop, loadFromLocalStorage, saveToLocalStorage } from './utilities';
import { AppBackground as AppBackgroundRuntype } from './runtypes';

export default function App() {
  const notificationsEmitter = useConstant(createNotificationsEmitter);
  const history = useConstant(createHistory);
  const recordingsStorage = useRecordingsStorage();

  const addNewRecording = useCallback(
    function addNewDownloadUrlCb(recording: Recording): void {
      recordingsStorage.add([recording]);
      history.push('/');
    },
    [history, recordingsStorage]
  );

  const historyGoBack = useCallback(
    function historyGoBackCb() {
      history.back();
    },
    [history]
  );

  const selectedAppBackground = useCallback(function appBgHandler(background: AppBackground) {
    applyBackground(background, document.getElementById('root')!);
    saveToLocalStorage('selected-app-background', background);
  }, []);

  useEffect(function loadSavedAppBg() {
    try {
      applyBackground(
        loadFromLocalStorage('selected-app-background', AppBackgroundRuntype),
        document.getElementById('root')!
      );
    } catch (error) {
      console.info('Error loading app background', `${error}`);
    }
  }, []);

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
    <RecordingsStorageContext.Provider value={recordingsStorage}>
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
              {!!recordingsStorage.storageEstimate && (
                <StorageEstimateBar estimate={recordingsStorage.storageEstimate} />
              )}
            </AboutPage>
          </Route>
          <Route route="/settings">
            <Settings onCancel={historyGoBack} onSelectedAppBackground={selectedAppBackground} />
          </Route>
          <Fallback>
            <Homescreen
              storageEstimate={recordingsStorage.storageEstimate}
              onPlayRecording={onPlayRecording}
            />
          </Fallback>
        </Switch>
        <Notifications emitter={notificationsEmitter} />
      </Router>
    </RecordingsStorageContext.Provider>
  );
}
