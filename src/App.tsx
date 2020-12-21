import React, { useCallback } from 'react';

import './App.scss';
import Recorder from './Recorder';
import Recording from './Recording';
import Homescreen from './Homescreen';
import Notifications, { createNotificationsEmitter } from './Notifications';
import { useConstant } from './hooks';
import { createHistory, Fallback, Link, Route, Router, Switch } from './Router';
import { useRecordingsDB } from './storage';
import RecordingPlayer from './RecordingPlayer';
import AboutPage from './AboutPage';

function noop() {}

export default function App() {
  const notificationsEmitter = useConstant(createNotificationsEmitter);
  const history = useConstant(createHistory);

  const {
    recordings,
    storageEstimate,
    add: addRecordingsToDB,
    update: updateRecordingsInDB,
    delete: deleteRecordingsFromDB,
  } = useRecordingsDB();

  const addNewRecording = useCallback(
    function addNewDownloadUrlCb(recording: Recording): void {
      addRecordingsToDB([recording]);
      history.push('/');
    },
    [history, addRecordingsToDB]
  );

  const setRecordingsList = useCallback(
    function setDownloadListCb(newList: readonly Recording[]): void {
      const currentIds = new Set(recordings.map((recording) => recording.databaseId));
      const newIds = new Set(newList.map((recording) => recording.databaseId));

      const deletedIds = new Set([...currentIds].filter((id) => !newIds.has(id)));
      const addedIds = new Set([...newIds].filter((id) => !currentIds.has(id)));
      const checkUpdatesIds = new Set(
        [...currentIds, ...newIds].filter((id) => !addedIds.has(id) && !deletedIds.has(id))
      );

      deleteRecordingsFromDB(
        recordings.filter((recording) => deletedIds.has(recording.databaseId))
      ).then((recordings) => {
        for (const recording of recordings) {
          notificationsEmitter.emit(`"${recording.filename}" deleted`, 'success');
        }
      });

      addRecordingsToDB(newList.filter((recording) => addedIds.has(recording.databaseId))).then(
        (recordings) => {
          for (const recording of recordings) {
            notificationsEmitter.emit(`"${recording.filename}" saved`, 'success');
          }
        }
      );

      updateRecordingsInDB(
        newList.filter((recording) => checkUpdatesIds.has(recording.databaseId))
      ).then((recordings) => {
        for (const recording of recordings) {
          notificationsEmitter.emit(`"${recording.filename}" updated`, 'success');
        }
      });
    },
    [
      addRecordingsToDB,
      deleteRecordingsFromDB,
      notificationsEmitter,
      recordings,
      updateRecordingsInDB,
    ]
  );

  React.useEffect(() => {
    Object.assign(window, { emitNotification: notificationsEmitter.emit });
  }, [notificationsEmitter.emit]);

  const onPlayRecording = useCallback(
    function handlePlayRecording(recording: Recording): void {
      history.push(`/play/${recording.databaseId}`);
    },
    [history]
  );

  return (
    <Router history={history}>
      <nav className="main-nav">
        <header className="main-header">
          <h1>
            <Link to="/" className="start-page-link">
              Weft
            </Link>
          </h1>
        </header>
      </nav>
      <Switch>
        <Route path="/record">
          <Recorder
            onNewRecording={addNewRecording}
            emitNotification={notificationsEmitter.emit}
            onRecordingStateChange={noop}
          />
        </Route>
        <Route path="/play/:recordingId">
          {/* TODO: Allow passing a render function with the route params */}
          {/* <video className="preview-video-player" controls /> */}
          <RecordingPlayer />
        </Route>
        <Route path="/about">
          <AboutPage />
        </Route>
        <Fallback>
          <Homescreen
            recordings={recordings}
            onEditRecordings={setRecordingsList}
            onPlayRecording={onPlayRecording}
            storageEstimate={storageEstimate}
          />
        </Fallback>
      </Switch>
      <Notifications emitter={notificationsEmitter} />
    </Router>
  );
}

// const backgrounds = [];
// const cssProps = [
//   'background',
//   'backgroundAttachment',
//   'backgroundBlendMode',
//   'backgroundClip',
//   'backgroundColor',
//   'backgroundImage',
//   'backgroundOrigin',
//   'backgroundPosition',
//   'backgroundRepeat',
//   'backgroundSize',
// ];
// const btns = Array.from(document.querySelectorAll('#stage .box a.button'));
// function previewBackground() {
//   const btn = btns.shift();
//   if (!btn || !(btn instanceof HTMLElement)) {
//     return;
//   }

//   btn.click();

//   setTimeout(() => {
//     const styles = cssProps.reduce((styles, cssProp) => {
//       const cssValue = document.body.style[cssProp];
//       if (cssValue) {
//         styles[cssProp] = cssValue;
//       }
//       return styles;
//     }, {});
//     backgrounds.push(styles);
//   });
//   setTimeout(previewBackground, 1000);
// }

// previewBackground();
