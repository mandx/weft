import { useCallback, /*useRef,*/ useState, MouseEvent, useEffect } from 'react';
import { ReactComponent as EmojiLaughingIcon } from 'bootstrap-icons/icons/emoji-laughing.svg';
import { ReactComponent as GearIcon } from 'bootstrap-icons/icons/gear.svg';
import { ReactComponent as CropIcon } from 'bootstrap-icons/icons/crop.svg';
import { ReactComponent as PlayIcon } from 'bootstrap-icons/icons/play.svg';

import { useRecordings } from './storage-swr';
import { Link } from './Router';
import './Homescreen.scss';
import Recording from './Recording';
import RecordingActionsToolbar from './RecordingActionsToolbar';

interface RecordingItemProps {
  /**
   * The item this element represents
   */
  readonly recording: Readonly<Recording>;

  /**
   * Callback triggered with a new "version" of this item.
   */
  readonly onEditRecordings: (recordings: readonly Readonly<Recording>[]) => void;

  /**
   * Callback triggered when deletion of this item is requested
   */
  readonly onDeleteRecordings: <T>(
    recordings: readonly Readonly<Recording>[],
    event: MouseEvent<T>
  ) => void;

  /**
   * Callback triggered when playback of this item is requested.
   */
  readonly onPlayRecording: <T>(recording: Readonly<Recording>, event: MouseEvent<T>) => void;
}

function HomescreenItem({ recording, onDeleteRecordings }: RecordingItemProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');

  useEffect(() => {
    let blobUrl: string = '';

    recording.getThumbnailBlob().then((blob) => {
      setThumbnailUrl((blobUrl = URL.createObjectURL(blob)));
    });

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [recording]);

  const handleDelete = useCallback(
    function <T>(recording: Readonly<Recording>, event: MouseEvent<T>): void {
      onDeleteRecordings([recording], event);
    },
    [onDeleteRecordings]
  );

  return (
    <>
      <img
        className="homescreen-recording-thumbnail"
        alt={recording.filename}
        title={recording.filename}
        src={thumbnailUrl}
      />
      <RecordingActionsToolbar
        className="homescreen-recording-actions"
        recording={recording}
        beforeButtons={
          <>
            <Link
              className="btn"
              title="Play"
              aria-label="Play"
              to={`/play/${recording.databaseId}`}
            >
              <PlayIcon className="btn-icon" role="presentation" />
            </Link>

            <Link
              className="btn"
              to={`/play/${recording.databaseId}/edit`}
              title="Trim"
              aria-label="Trim"
            >
              <CropIcon className="btn-icon" role="presentation" />
            </Link>
          </>
        }
        onDeleteRecording={handleDelete}
      />
    </>
  );
}

export interface HomescreenProps {
  /**
   * Callback triggered when playback of an item is requested.
   */
  readonly onPlayRecording: RecordingItemProps['onPlayRecording'];

  readonly storageEstimate?: Readonly<StorageEstimate>;
}

export default function Homescreen({ onPlayRecording }: HomescreenProps) {
  const recordings = useRecordings();

  let content = (
    <div className="homescreen-recording-loading">
      <p>Loading recordings...</p>
    </div>
  );

  switch (recordings.data.status) {
    case 'loaded':
      content = (
        <ul className="homescreen-recordings">
          {recordings.data.list.map((recording, _index) => (
            <li key={recording.databaseId} className="homescreen-item homescreen-recording">
              <HomescreenItem
                recording={recording}
                onEditRecordings={recordings.update}
                onDeleteRecordings={recordings.delete}
                onPlayRecording={onPlayRecording}
              />
            </li>
          ))}
        </ul>
      );
      break;

    case 'error':
      content = (
        <div className="homescreen-recording-error">
          <p>Error loading recordings</p>
          <pre>{JSON.stringify(recordings.data.reason)}</pre>
        </div>
      );
      break;
  }

  return (
    <section className="homescreen">
      <Link to="/record" className="start-recording btn">
        Start Recording
      </Link>
      {content}
      <div className="pages-links">
        <Link className="settings-page-link btn" to="/settings">
          <GearIcon className="btn-icon" />
          <span className="btn-text">Settings</span>
        </Link>
        <Link className="about-page-link btn" to="/about">
          <EmojiLaughingIcon className="btn-icon" />
          <span className="btn-text">About Weft</span>
        </Link>
      </div>
    </section>
  );
}
