import React, { Fragment, useEffect, useState, useRef, useCallback } from 'react';
import { ReactComponent as DownloadIcon } from 'bootstrap-icons/icons/download.svg';
import { ReactComponent as PlayIcon } from 'bootstrap-icons/icons/play.svg';
import { ReactComponent as PencilIcon } from 'bootstrap-icons/icons/pencil.svg';
import { ReactComponent as XCircleIcon } from 'bootstrap-icons/icons/x-circle.svg';
import { ReactComponent as TrashIcon } from 'bootstrap-icons/icons/trash.svg';

import './RecordingsList.scss';

type URLStr = ReturnType<typeof URL.createObjectURL>;

export class Recording {
  private _url: URLStr;
  private _timestamp: Date;
  private _filename: string;

  constructor(src: Blob | URLStr) {
    this._url = src instanceof Blob ? URL.createObjectURL(src) : src;
    this._timestamp = new Date();
    this._filename = `${this._timestamp.toISOString()}.webm`;
  }

  /**
   * URL of the video to be played; it can be a Blob URL or an external URL
   */
  get url(): URLStr {
    return this._url;
  }

  /**
   * Creation timestamp
   */
  get timestamp(): Date {
    return this._timestamp;
  }

  /**
   * Filename for the video; for example, used as the `download` attribute for
   * anchor elements
   */
  get filename(): string {
    return this._filename;
  }

  set filename(newFilename: string) {
    this._filename = newFilename;
  }

  /**
   * Check if this is an unsaved URL (hasn't been uploaded)
   */
  isUnsaved(): boolean {
    return this.url.startsWith('blob:');
  }

  cloneWithNewFilename(newFilename: string): Recording {
    const clone = new Recording(this.url);
    clone._filename = newFilename;
    return clone;
  }
}

interface RecordingItemProps {
  /**
   * The item this element represents
   */
  recording: Recording;

  /**
   * Callback triggered with a new "version" of this item.
   */
  onEditRecording(recording: Recording): void;

  /**
   * Callback triggered when deletion of this item is requested
   */
  onDeleteRecording<T>(recording: Recording, event: React.MouseEvent<T>): void;

  /**
   * Callback triggered when playback of this item is requested.
   */
  onPlayRecording<T>(recording: Recording, event: React.MouseEvent<T>): void;
}

function RecordingItem({
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
        // onEditRecording({ ...recording, filename: input.value });
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
    <form onSubmit={handleSubmit}>
      {editing ? (
        <input defaultValue={recording.filename} ref={inputRef} />
      ) : (
        <a
          href={recording.url}
          download={recording.filename}
          title={recording.timestamp.toLocaleString()}>
          <DownloadIcon role="presentation" /> Download recording
        </a>
      )}
      {editing ? (
        <Fragment>
          <button type="submit">
            <PencilIcon role="presentation" /> Save
          </button>
          <button type="button" onClick={cancelEditing}>
            <XCircleIcon role="presentation" /> Cancel
          </button>
        </Fragment>
      ) : (
        <Fragment>
          <button type="button" onClick={handlePlay}>
            <PlayIcon role="presentation" /> Play
          </button>
          <button type="button" onClick={startEditing}>
            <PencilIcon role="presentation" /> Rename
          </button>
        </Fragment>
      )}
      <button type="button" onClick={handleDelete}>
        <TrashIcon role="presentation" /> Delete
      </button>
    </form>
  );
}

export interface RecordingsListProps {
  /**
   * Array of items to display by the manager
   */
  recordings: Recording[];

  /**
   * Callback triggered when a modified version of the items list is ready.
   * Any type of modification (item deletion or edits) will come as a new list
   * entirely.
   */
  onEditRecordings(items: Recording[]): void;

  /**
   * Callback triggered when playback of an item is requested.
   */
  onPlayRecording: RecordingItemProps['onPlayRecording'];
}

export default function RecordingsList({
  recordings,
  onEditRecordings,
  onPlayRecording,
}: RecordingsListProps) {
  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (recordings.filter((recording) => recording.isUnsaved()).length) {
        // TODO: Figure out a way to visually point to the unsaved recordings
        // `setState` can be called but since it works asynchronously, the
        // `className` isn't affected _after_ the browser's modal is dismissed
        // Saving a `ref` to the element and adding the class imperatively
        // also doesn't work, not sure why...
        event.preventDefault();
        event.returnValue =
          "There are still some unsaved recordings; if you close this page or navigate away they won't be available anymore. Are you sure you want to continue?";
        return event.returnValue;
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [recordings]);

  if (!recordings.length) {
    return null;
  }

  return (
    <ul className="recordings-list">
      {recordings.map((recording, index) => (
        <li key={recording.url}>
          <RecordingItem
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
  );
}
