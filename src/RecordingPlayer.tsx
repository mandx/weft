import { useState, useEffect, useCallback } from 'react';
import { ReactComponent as QuestionOctagonIcon } from 'bootstrap-icons/icons/question-octagon.svg';

import { useRecordings } from './storage-swr';
import { Link, useHistory, useRouteParams } from './Router';
import SectionPage from './SectionPage';
import Recording from './Recording';
import RecordingSearch from './RecordingSearch';
import VideoElement from './VideoElement';
import VideoPlayerEditor from './VideoPlayerEditor';
import * as paths from './app-routes';

import './RecordingPlayer.scss';
import RecordingActionsToolbar from './RecordingActionsToolbar';
import { noop } from './utilities';

interface RecordingPlayerProps {
  editMode?: boolean;
}

export default function RecordingPlayer({ editMode }: RecordingPlayerProps): JSX.Element {
  const { recordingId } = useRouteParams() || {};
  const recordings = useRecordings();
  const [recordingBlob, setRecordingBlob] = useState<Blob | undefined>(undefined);
  const [recordingBlobURL, setRecordingBlobURL] = useState<string>('');

  const recording =
    recordingId && recordings.data.status === 'loaded'
      ? recordings.data.list.find((recording) => recording.databaseId === recordingId)
      : undefined;

  useEffect(
    function loadRecordingBlob() {
      let blobUrl: string = '';
      let ignore: boolean = false;

      recording?.getBlob().then((blob) => {
        if (!ignore) {
          setRecordingBlob(blob);
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

  const history = useHistory();

  const deleteRecording = useCallback(
    function handleDeleteRecording(recording: Readonly<Recording>): Promise<void> {
      return recordings.delete([recording]).then(() => {
        history?.push(paths.index, undefined);
      });
    },
    [history, recordings]
  );

  const editRecording = useCallback(
    function handleEditRecording(recording: Readonly<Recording>): Promise<void> {
      return recordings.update([recording]).then(noop);
    },
    [recordings]
  );

  if (!recording) {
    return (
      <SectionPage className="recording-player">
        <div className="recording-not-found">
          <QuestionOctagonIcon className="question-icon" />
          <p className="recording-not-found-text">
            No recording found... somehow we got here via a bad link?{' '}
            {recordings.data.status === 'loaded' && recordings.data.list.length ? (
              <>
                You can{' '}
                <Link className="home-link" path={paths.index}>
                  go back home
                </Link>
                , create a <Link path={paths.record}>new recording</Link> or play one of your saved
                ones.
              </>
            ) : (
              <>
                You can{' '}
                <Link className="home-link" path={paths.index}>
                  go back home
                </Link>{' '}
                or create a <Link path={paths.record}>new recording</Link>.
              </>
            )}
          </p>
          {!!(recordings.data.status === 'loaded' && recordings.data.list.length) && (
            <RecordingSearch recordings={recordings.data.list} />
          )}
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
      {!!recordingBlobURL &&
        (editMode && recordingBlob ? (
          <VideoPlayerEditor recording={recording} />
        ) : (
          <VideoElement
            src={recordingBlobURL}
            className="recording-player-video video-player"
            controls
            autoPlay={false}
            preload="metadata"
          />
        ))}
    </SectionPage>
  );
}
