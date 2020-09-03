import React, { Fragment, useState, useRef, useCallback } from 'react';

import './DownloadsList.scss';

export interface DownloadUrl {
  url: ReturnType<typeof URL.createObjectURL>;
  timestamp: Date;
  filename: string;
}

interface DownloadItemProps {
  item: DownloadUrl,
  onEditItem(item: DownloadUrl): void,
  onDeleteItem(item: DownloadUrl): void,
}

function DownloadItem({ item, onEditItem, onDeleteItem }: DownloadItemProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDelete = useCallback(event => {
    console.log('handleDelete');
    event.preventDefault();
    onDeleteItem(item);
  }, [item, onDeleteItem]);

  const handleSubmit = useCallback((event) => {
    console.log('handleSubmit');
    event.preventDefault();

    const input = inputRef.current;
    if (editing && input) {
      onEditItem({ ...item, filename: input.value });
    }

    setEditing(false);
  }, [item, editing, onEditItem]);

  const startEditing = useCallback(() => {
    console.log('startEditing');
    setEditing(true);
  }, []);

  const cancelEditing = useCallback(() => {
    console.log('startEditing');
    setEditing(false);
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      {editing ?
      <input defaultValue={item.filename} ref={inputRef} />:
      <a href={item.url} download={item.filename} title={item.timestamp.toLocaleString()}>
        Download video
      </a>
      }
      {editing ?
        <Fragment>
      <button key="button-submit" type="submit">Save</button>
      <button type="button" onClick={cancelEditing}>
      Cancel
      </button>
        </Fragment>
      :
      <button key="button-button" type="button" onClick={startEditing}>
        Rename
      </button>
      }
      <button type="button" onClick={handleDelete}>Delete</button>
    </form>
  );
}

export interface DownloadsListManagerProps {
  items: DownloadUrl[];
  onEditItems(items: DownloadUrl[]): void;
}

export default function DownloadsListManager({ items, onEditItems }: DownloadsListManagerProps) {
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
          />
        </li>
      ))}
    </ul>
  );
}
