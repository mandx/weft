import React, { Fragment, useCallback, useRef, useState } from 'react';
import { ReactComponent as DownloadIcon } from 'bootstrap-icons/icons/download.svg';
import { ReactComponent as PlayIcon } from 'bootstrap-icons/icons/play.svg';
import { ReactComponent as PencilIcon } from 'bootstrap-icons/icons/pencil.svg';
import { ReactComponent as XCircleIcon } from 'bootstrap-icons/icons/x-circle.svg';
import { ReactComponent as TrashIcon } from 'bootstrap-icons/icons/trash.svg';
import { ReactComponent as EmojiLaughingIcon } from 'bootstrap-icons/icons/emoji-laughing.svg';
import { ReactComponent as GearIcon } from 'bootstrap-icons/icons/gear.svg';

import './Homescreen.scss';
import Recording from './Recording';
import DownloadRecordingBtn from './DownloadRecording';
import { Link } from './Router';

interface RecordingItemProps {
  /**
   * The item this element represents
   */
  readonly recording: Recording;

  /**
   * Callback triggered with a new "version" of this item.
   */
  readonly onEditRecording: (recording: Recording) => void;

  /**
   * Callback triggered when deletion of this item is requested
   */
  readonly onDeleteRecording: <T>(recording: Recording, event: React.MouseEvent<T>) => void;

  /**
   * Callback triggered when playback of this item is requested.
   */
  readonly onPlayRecording: <T>(recording: Recording, event: React.MouseEvent<T>) => void;
}

function HomescreenItem({
  recording,
  onEditRecording,
  onDeleteRecording,
  onPlayRecording,
}: RecordingItemProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDelete = useCallback(
    function <T>(event: React.MouseEvent<T>): void {
      onDeleteRecording(recording, event);
    },
    [recording, onDeleteRecording]
  );

  const handleSubmit = useCallback(
    function <T>(event: React.MouseEvent<T>): void {
      event.preventDefault();

      const input = inputRef.current;
      if (editing && input) {
        onEditRecording(recording.cloneWithNewFilename(input.value));
      }

      setEditing(false);
    },
    [recording, editing, onEditRecording]
  );

  const startEditing = useCallback(function <T>(_event: React.MouseEvent<T>): void {
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(function <T>(_event: React.MouseEvent<T>): void {
    setEditing(false);
  }, []);

  const handlePlay = useCallback(
    function <T>(event: React.MouseEvent<T>): void {
      onPlayRecording(recording, event);
    },
    [recording, onPlayRecording]
  );

  return (
    <div className="homescreen-recording">
      <div className="homescreen-recording-thumbnail-wrapper">
        <img
          className="homescreen-recording-thumbnail"
          alt={recording.filename}
          src={recording.thumbnailUrl}
        />
      </div>
      <form onSubmit={handleSubmit} className="homescreen-recording-actions">
        {editing ? (
          <input
            defaultValue={recording.filename}
            ref={inputRef}
            className="homescreen-item-name"
          />
        ) : (
          <DownloadRecordingBtn
            recording={recording}
            className="homescreen-item-name"
            title={`Download recording: ${recording.timestamp.toLocaleString()}`}
            aria-label={`Download recording: ${recording.timestamp.toLocaleString()}`}>
            <DownloadIcon role="presentation" /> Download
          </DownloadRecordingBtn>
        )}
        {editing ? (
          <Fragment>
            <button type="submit" title="Save" aria-label="Save">
              <PencilIcon role="presentation" />
            </button>
            <button type="button" onClick={cancelEditing} title="Cancel" aria-label="Cancel">
              <XCircleIcon role="presentation" />
            </button>
          </Fragment>
        ) : (
          <Fragment>
            {/* maybe use a <Router.Link/> instead? */}
            <button type="button" onClick={handlePlay} title="Play" aria-label="Play">
              <PlayIcon role="presentation" />
            </button>
            <button type="button" onClick={startEditing} title="Rename" aria-label="Rename">
              <PencilIcon role="presentation" />
            </button>
          </Fragment>
        )}
        <button type="button" onClick={handleDelete} title="Delete" aria-label="Delete">
          <TrashIcon role="presentation" />
        </button>
      </form>
    </div>
  );
}

export interface HomescreenProps {
  /**
   * Array of items to display by the manager
   */
  readonly recordings: readonly Recording[];

  /**
   * Callback triggered when a modified version of the items list is ready.
   * Any type of modification (item deletion or edits) will come as a new list
   * entirely.
   */
  readonly onEditRecordings: (items: readonly Recording[]) => void;

  /**
   * Callback triggered when playback of an item is requested.
   */
  readonly onPlayRecording: RecordingItemProps['onPlayRecording'];

  readonly storageEstimate?: Readonly<StorageEstimate>;
}

export default function Homescreen({
  recordings,
  onEditRecordings,
  onPlayRecording,
}: HomescreenProps) {
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

  //   window.addEventListener('beforeunload', handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener('beforeunload', handleBeforeUnload);
  //   };
  // }, [recordings]);

  return (
    <section className="homescreen">
      <Link to="/record" className="start-recording">
        Start Recording
      </Link>
      <ul className="homescreen-recordings">
        {recordings.map((recording, index) => (
          <li key={recording.databaseId} className="homescreen-item">
            <HomescreenItem
              recording={recording}
              onEditRecording={(edited) => {
                const newList = recordings.slice();
                newList.splice(index, 1, edited);
                onEditRecordings(newList);
              }}
              onDeleteRecording={() => {
                const newItems = recordings.slice();
                newItems.splice(index, 1);
                onEditRecordings(newItems);
              }}
              onPlayRecording={onPlayRecording}
            />
          </li>
        ))}
      </ul>
      <div className="pages-links">
        <Link className="settings-page-link pages-link" to="/settings">
          <GearIcon />
          Settings
        </Link>
        <Link className="about-page-link pages-link" to="/about">
          <EmojiLaughingIcon />
          About Weft
        </Link>
      </div>
    </section>
  );
}
