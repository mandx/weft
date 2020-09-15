import React, { Fragment, useState, useRef, useCallback } from 'react';
import { ReactComponent as DownloadIcon } from 'bootstrap-icons/icons/download.svg';
import { ReactComponent as PlayIcon } from 'bootstrap-icons/icons/play.svg';
import { ReactComponent as PencilIcon } from 'bootstrap-icons/icons/pencil.svg';
import { ReactComponent as XCircleIcon } from 'bootstrap-icons/icons/x-circle.svg';
import { ReactComponent as TrashIcon } from 'bootstrap-icons/icons/trash.svg';

import './DownloadsList.scss';

export interface DownloadUrl {
  url: ReturnType<typeof URL.createObjectURL>;
  timestamp: Date;
  filename: string;
}

export function createDownloadUrl(blob: Blob): DownloadUrl {
  const timestamp = new Date();
  return {
    url: URL.createObjectURL(blob),
    filename: `${timestamp.toISOString()}.webm`,
    timestamp,
  };
}

interface DownloadItemProps {
  item: DownloadUrl;
  onEditItem(item: DownloadUrl): void;
  onDeleteItem<T>(item: DownloadUrl, event: React.MouseEvent<T>): void;
  onPlayItem<T>(item: DownloadUrl, event: React.MouseEvent<T>): void;
}

function DownloadItem({ item, onEditItem, onDeleteItem, onPlayItem }: DownloadItemProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDelete = useCallback(
    function <T>(event: React.MouseEvent<T>): void {
      onDeleteItem(item, event);
    },
    [item, onDeleteItem]
  );

  const handleSubmit = useCallback(
    function <T>(event: React.MouseEvent<T>): void {
      event.preventDefault();

      const input = inputRef.current;
      if (editing && input) {
        onEditItem({ ...item, filename: input.value });
      }

      setEditing(false);
    },
    [item, editing, onEditItem]
  );

  const startEditing = useCallback(function <T>(_event: React.MouseEvent<T>): void {
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(function <T>(_event: React.MouseEvent<T>): void {
    setEditing(false);
  }, []);

  const handlePlay = useCallback(
    function <T>(event: React.MouseEvent<T>): void {
      onPlayItem(item, event);
    },
    [item, onPlayItem]
  );

  return (
    <form onSubmit={handleSubmit}>
      {editing ? (
        <input defaultValue={item.filename} ref={inputRef} />
      ) : (
        <a href={item.url} download={item.filename} title={item.timestamp.toLocaleString()}>
          <DownloadIcon role="presentation" /> Download video
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

export interface DownloadsListManagerProps {
  items: DownloadUrl[];
  onEditItems(items: DownloadUrl[]): void;
  onPlayItem: DownloadItemProps['onPlayItem'];
}

export default function DownloadsListManager({
  items,
  onEditItems,
  onPlayItem,
}: DownloadsListManagerProps) {
  if (!items.length) {
    return null;
  }

  return (
    <ul className="downloads">
      {items.map((item, index) => (
        <li key={item.url}>
          <DownloadItem
            item={item}
            onEditItem={(edited) => {
              const newItems = items.slice();
              newItems.splice(index, 1, edited);
              onEditItems(newItems);
            }}
            onDeleteItem={() => {
              const newItems = items.slice();
              newItems.splice(index, 1);
              onEditItems(newItems);
            }}
            onPlayItem={onPlayItem}
          />
        </li>
      ))}
    </ul>
  );
}
