import { useState, useEffect, useCallback, useContext } from 'react';
import { ReactComponent as QuestionOctagonIcon } from 'bootstrap-icons/icons/question-octagon.svg';
// import { ReactComponent as DiscIcon } from 'bootstrap-icons/icons/disc.svg';

import { useRecordingsStorage } from './storage';
import { useRouteParams } from './Router';
import SectionPage from './SectionPage';
import Recording from './Recording';
import { Link, HistoryContext } from './Router';
import RecordingSearch from './RecordingSearch';
import VideoPlayerEditor from './VideoPlayerEditor';

import './RecordingPlayer.scss';
import RecordingActionsToolbar from './RecordingActionsToolbar';
import { noop } from './utilities';

export default function RecordingPlayer(): JSX.Element {
  const { recordings, update: updateRecordings, delete: deleteRecordings } = useRecordingsStorage();
  const { recordingId } = useRouteParams() || {};
  const [recordingBlobURL, setRecordingBlobURL] = useState<string>('');

  const recording = recordingId
    ? recordings.find((recording) => recording.databaseId === recordingId)
    : undefined;

  useEffect(
    function loadRecordingBlob() {
      let blobUrl: string = '';
      let ignore: boolean = false;

      recording?.getBlob().then((blob) => {
        if (!ignore) {
          setRecordingBlobURL((blobUrl = URL.createObjectURL(blob)));
        }
      });

      return () => {
        ignore = true;
        setRecordingBlobURL('');
        URL.revokeObjectURL(blobUrl);
      };
    },
    [recording]
  );

  const historyContext = useContext(HistoryContext);

  const deleteRecording = useCallback(
    function handleDeleteRecording(recording: Readonly<Recording>): Promise<void> {
      return deleteRecordings([recording]).then(() => {
        historyContext?.history.push('/');
      });
    },
    [historyContext, deleteRecordings]
  );

  const editRecording = useCallback(
    function handleEditRecording(recording: Readonly<Recording>): Promise<void> {
      return updateRecordings([recording]).then(noop);
    },
    [updateRecordings]
  );

  if (!recording) {
    return (
      <SectionPage className="recording-player">
        <div className="recording-not-found">
          <QuestionOctagonIcon className="question-icon" />
          <p className="recording-not-found-text">
            No recording found... somehow we got here via a bad link?{' '}
            {!!recordings.length ? (
              <>
                You can{' '}
                <Link className="home-link" to="/">
                  go back home
                </Link>
                , create a <Link to="/record">new recording</Link> or play one of your saved ones.
              </>
            ) : (
              <>
                You can{' '}
                <Link className="home-link" to="/">
                  go back home
                </Link>{' '}
                or create a <Link to="/record">new recording</Link>.
              </>
            )}
          </p>
          {!!recordings.length && <RecordingSearch recordings={recordings} />}
        </div>
      </SectionPage>
    );
  }

  return (
    <SectionPage className="recording-player">
      {!!recording && (
        <RecordingActionsToolbar
          recording={recording}
          onDeleteRecording={deleteRecording}
          onEditRecording={editRecording}
        />
      )}
      <VideoPlayerEditor videoSrc={recordingBlobURL} className="recording-player-video" />
    </SectionPage>
  );
}
