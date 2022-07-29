import { Fragment, useCallback, useRef, useState, MouseEvent } from 'react';
import { ReactComponent as DownloadIcon } from 'bootstrap-icons/icons/download.svg';
import { ReactComponent as PlayIcon } from 'bootstrap-icons/icons/play.svg';
import { ReactComponent as PencilIcon } from 'bootstrap-icons/icons/pencil.svg';
import { ReactComponent as XCircleIcon } from 'bootstrap-icons/icons/x-circle.svg';
import { ReactComponent as TrashIcon } from 'bootstrap-icons/icons/trash.svg';

import Recording from './Recording';
import DownloadRecordingBtn from './DownloadRecording';
import './RecordingActionsToolbar.scss';
import { classnames } from './utilities';

interface RecordingActionsToolbarProps {
  readonly className?: string;

  /**
   * The item this element represents
   */
  readonly recording: Readonly<Recording>;

  /**
   * Control what to display for a title/name. Possible values are:
   *
   * - `undefined` | `true`: Use the recording's `filename` as the title
   * - `false`: Don't display anything
   * - A `string`: Explicitly use this value as the title
   */
  readonly displayFilename?: boolean | string;

  /**
   * UI to add before the toolbar buttons
   */
  beforeButtons?: JSX.Element;

  /**
   * UI to add after the toolbar buttons
   */
  afterButtons?: JSX.Element;

  /**
   * Callback triggered with a new "version" of this item.
   */
  readonly onEditRecording?: (recording: Readonly<Recording>) => void;

  /**
   * Callback triggered when deletion of this item is requested
   */
  readonly onDeleteRecording?: <T>(recording: Readonly<Recording>, event: MouseEvent<T>) => void;

  /**
   * Callback triggered when playback of this item is requested.
   */
  readonly onPlayRecording?: <T>(recording: Readonly<Recording>, event: MouseEvent<T>) => void;
}

export default function RecordingActionsToolbar({
  recording,
  displayFilename,
  className,
  beforeButtons,
  afterButtons,
  onEditRecording,
  onDeleteRecording,
  onPlayRecording,
}: RecordingActionsToolbarProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDeleteClicked = useCallback(
    function handleDeleteClick<T>(event: MouseEvent<T>): void {
      onDeleteRecording?.(recording, event);
    },
    [recording, onDeleteRecording]
  );

  const onRenameFormSubmitted = useCallback(
    function handleFormSubmit<T>(event: MouseEvent<T>): void {
      event.preventDefault();

      const input = inputRef.current;
      if (editing && input && onEditRecording) {
        onEditRecording(recording.cloneWithNewFilename(input.value));
      }

      setEditing(false);
    },
    [recording, editing, onEditRecording]
  );

  const onRenameClicked = useCallback(function handleRenameClick<T>(_event: MouseEvent<T>): void {
    setEditing(true);
  }, []);

  const onCancelEditClicked = useCallback(function handleCancelEditClick<T>(
    _event: MouseEvent<T>
  ): void {
    setEditing(false);
  },
  []);

  const onPlayClicked = useCallback(
    function handlePlayClick<T>(event: MouseEvent<T>): void {
      onPlayRecording?.(recording, event);
    },
    [recording, onPlayRecording]
  );

  return (
    <form
      onSubmit={onRenameFormSubmitted}
      className={classnames('recording-actions-toolbar', className)}
    >
      {editing ? (
        <input
          type="text"
          defaultValue={recording.filename}
          ref={inputRef}
          className="recording-item-name"
        />
      ) : displayFilename === undefined || displayFilename === true ? (
        <span className="recording-item-name" title={recording.filename}>
          {recording.filename}
        </span>
      ) : typeof displayFilename === 'string' ? (
        <span className="recording-item-name" title={displayFilename}>
          {displayFilename}
        </span>
      ) : (
        false
      )}
      {editing ? (
        <Fragment>
          {/* TODO: Find a semantically better element for the filename */}
          <button className="btn" type="submit" title="Save" aria-label="Save">
            <PencilIcon className="btn-icon" role="presentation" />
          </button>
          <button
            className="btn"
            type="button"
            onClick={onCancelEditClicked}
            title="Cancel"
            aria-label="Cancel"
          >
            <XCircleIcon className="btn-icon" role="presentation" />
          </button>
        </Fragment>
      ) : (
        <Fragment>
          {beforeButtons}
          {!!onPlayRecording && (
            <button
              className="btn"
              type="button"
              onClick={onPlayClicked}
              title="Play"
              aria-label="Play"
            >
              <PlayIcon className="btn-icon" role="presentation" />
            </button>
          )}
          <button
            className="btn"
            type="button"
            onClick={onRenameClicked}
            title="Rename"
            aria-label="Rename"
          >
            <PencilIcon className="btn-icon" role="presentation" />
          </button>
          {!!onDeleteRecording && (
            <button
              className="btn"
              type="button"
              onClick={onDeleteClicked}
              title="Delete"
              aria-label="Delete"
            >
              <TrashIcon className="btn-icon" role="presentation" />
            </button>
          )}
          <DownloadRecordingBtn recording={recording} className="btn">
            <DownloadIcon className="btn-icon" role="presentation" />
          </DownloadRecordingBtn>
          {afterButtons}
        </Fragment>
      )}
    </form>
  );
}
