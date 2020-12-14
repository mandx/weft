import { useState, useEffect } from 'react';
import { ReactComponent as QuestionOctagonIcon } from 'bootstrap-icons/icons/question-octagon.svg';
import { ReactComponent as DiscIcon } from 'bootstrap-icons/icons/disc.svg';

import { useRecordingsDB } from './storage';
import { useRouteParams } from './Router';
import Recording from './Recording';
import { Link } from './Router';
import RecordingSearch from './RecordingSearch';

import './RecordingPlayer.scss';

export default function RecordingPlayer(): JSX.Element {
  const { recordings } = useRecordingsDB();
  const { recordingId } = useRouteParams() || {};
  const [status, setStatus] = useState<'loading' | 'not-found'>('loading');
  const [recording, setRecording] = useState<Recording | undefined>(undefined);
  const [recordingSrc, setRecordingSrc] = useState<string>('');

  useEffect(() => {
    let blobUrl = '';

    if (!recordingId) {
      setStatus('not-found');
      return;
    }

    const recording = recordings.find((recording) => recording.databaseId === recordingId);
    if (!recording) {
      setStatus('not-found');
      return;
    }

    setRecording(recording);
    recording.getBlob().then((blob) => {
      setRecordingSrc((blobUrl = URL.createObjectURL(blob)));
    });

    return () => {
      setRecordingSrc('');
      URL.revokeObjectURL(blobUrl);
    };
  }, [recordings, recordingId]);

  if (recordingSrc) {
    return (
      <section className="recording-player">
        <video src={recordingSrc} className="recording-video-player" controls autoPlay />
      </section>
    );
  }

  switch (status) {
    case 'not-found':
      return (
        <section className="recording-player">
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
        </section>
      );
    default:
      return (
        <section className="recording-player">
          <div className="recording-loading">
            <DiscIcon className="loading-icon" />
            Loading...
            {!!recording && recording.filename}
          </div>
        </section>
      );
  }
}
