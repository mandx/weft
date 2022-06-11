import { Fragment, useCallback, useRef, useState, MouseEvent } from 'react';
import { ReactComponent as DownloadIcon } from 'bootstrap-icons/icons/download.svg';
import { ReactComponent as PlayIcon } from 'bootstrap-icons/icons/play.svg';
import { ReactComponent as PencilIcon } from 'bootstrap-icons/icons/pencil.svg';
import { ReactComponent as XCircleIcon } from 'bootstrap-icons/icons/x-circle.svg';
import { ReactComponent as TrashIcon } from 'bootstrap-icons/icons/trash.svg';
import { ReactComponent as EmojiLaughingIcon } from 'bootstrap-icons/icons/emoji-laughing.svg';
import { ReactComponent as GearIcon } from 'bootstrap-icons/icons/gear.svg';

import { Link } from './Router';
import { RecordingsStorageContext } from './storage';
import './Homescreen.scss';
import Recording from './Recording';
import DownloadRecordingBtn from './DownloadRecording';

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

function HomescreenItem({
  recording,
  onEditRecordings,
  onDeleteRecordings,
  onPlayRecording,
}: RecordingItemProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDelete = useCallback(
    function <T>(event: MouseEvent<T>): void {
      onDeleteRecordings([recording], event);
    },
    [recording, onDeleteRecordings]
  );

  const handleSubmit = useCallback(
    function <T>(event: MouseEvent<T>): void {
      event.preventDefault();

      const input = inputRef.current;
      if (editing && input) {
        onEditRecordings([recording.cloneWithNewFilename(input.value)]);
      }

      setEditing(false);
    },
    [recording, editing, onEditRecordings]
  );

  const startEditing = useCallback(function <T>(_event: MouseEvent<T>): void {
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(function <T>(_event: MouseEvent<T>): void {
    setEditing(false);
  }, []);

  const handlePlay = useCallback(
    function <T>(event: MouseEvent<T>): void {
      onPlayRecording(recording, event);
    },
    [recording, onPlayRecording]
  );

  return (
    <>
      {/*<div className="homescreen-recording">*/}
      <img
        className="homescreen-recording-thumbnail"
        alt={recording.filename}
        title={recording.filename}
        src={recording.thumbnailUrl}
      />
      {/*<div className="homescreen-recording-thumbnail-wrapper"></div>*/}
      <form onSubmit={handleSubmit} className="homescreen-recording-actions">
        {editing ? (
          <input
            defaultValue={recording.filename}
            ref={inputRef}
            className="homescreen-item-name"
          />
        ) : (
          <DownloadRecordingBtn recording={recording} className="btn">
            <DownloadIcon className="btn-icon" role="presentation" />
            <span className="btn-text">Download</span>
          </DownloadRecordingBtn>
        )}
        {editing ? (
          <Fragment>
            <button className="btn" type="submit" title="Save" aria-label="Save">
              <PencilIcon className="btn-icon" role="presentation" />
            </button>
            <button
              className="btn"
              type="button"
              onClick={cancelEditing}
              title="Cancel"
              aria-label="Cancel"
            >
              <XCircleIcon className="btn-icon" role="presentation" />
            </button>
          </Fragment>
        ) : (
          <Fragment>
            {/* maybe use a <Router.Link/> instead? */}
            <button
              className="btn"
              type="button"
              onClick={handlePlay}
              title="Play"
              aria-label="Play"
            >
              <PlayIcon className="btn-icon" role="presentation" />
            </button>
            <button
              className="btn"
              type="button"
              onClick={startEditing}
              title="Rename"
              aria-label="Rename"
            >
              <PencilIcon className="btn-icon" role="presentation" />
            </button>
          </Fragment>
        )}
        <button
          className="btn"
          type="button"
          onClick={handleDelete}
          title="Delete"
          aria-label="Delete"
        >
          <TrashIcon className="btn-icon" role="presentation" />
        </button>
      </form>
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
  // useEffect(() => {
  //   function handleBeforeUnload(event: BeforeUnloadEvent) {
  //     if (recordings.filter((recording) => recording.isUnsaved()).length) {
  //       // TODO: Figure out a way to visually point to the unsaved recordings
  //       // `setState` can be called but since it works asynchronously, the
  //       // `className` isn't affected _after_ the browser's modal is dismissed
  //       // Saving a `ref` to the element and adding the class imperatively
  //       // also doesn't work, not sure why...
  //       event.preventDefault();
  //       event.returnValue =
  //         "There are still some unsaved recordings; if you close this page or navigate away they won't be available anymore. Are you sure you want to continue?";
  //       return event.returnValue;
  //     }
  //   }
  //
  //   window.addEventListener('beforeunload', handleBeforeUnload);
  //
  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [recordings]);

  return (
    <section className="homescreen">
      <Link to="/record" className="start-recording btn">
        Start Recording
      </Link>
      <RecordingsStorageContext.Consumer>
        {(recordingsStorage) =>
          !!recordingsStorage && (
            <ul className="homescreen-recordings">
              {recordingsStorage.recordings.map((recording, _index) => (
                <li key={recording.databaseId} className="homescreen-item homescreen-recording">
                  <HomescreenItem
                    recording={recording}
                    onEditRecordings={recordingsStorage.update}
                    onDeleteRecordings={recordingsStorage.delete}
                    onPlayRecording={onPlayRecording}
                  />
                </li>
              ))}
            </ul>
          )
        }
      </RecordingsStorageContext.Consumer>
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
