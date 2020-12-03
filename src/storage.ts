import { useState, useEffect } from 'react';
import Dexie from 'dexie';

import { useConstant } from './hooks';
import Recording, { DatabaseID } from './Recording';

export interface RecordingRow {
  readonly id: DatabaseID;
  readonly src: Blob;
  readonly timestamp: Date;
  readonly filename: string;
  readonly thumbnail: Blob;
}

export class Database extends Dexie {
  public recordings: Dexie.Table<RecordingRow, DatabaseID>;

  constructor() {
    super('Weft');
    this.version(1).stores({
      recordings: '&id,timestamp,filename',
    });
    this.recordings = this.table('recordings');
  }
}

function loadRecordings(
  recordingsTable: Dexie.Table<RecordingRow, DatabaseID>
): Promise<Recording[]> {
  return new Promise((resolve, reject) => {
    recordingsTable
      .orderBy('timestamp')
      .reverse()
      .toArray()
      .then((items) => {
        resolve(
          items.map(
            (item) =>
              new Recording(item.src, item.thumbnail, {
                filename: item.filename,
                databaseId: item.id,
              })
          )
        );
      }, reject);
  });
}

export interface RecordingsDBHook {
  readonly storageEstimate?: Readonly<StorageEstimate>;
  readonly recordings: readonly Recording[];
  readonly add: (recordings: readonly Recording[]) => Promise<readonly Recording[]>;
  readonly update: (recordings: readonly Recording[]) => Promise<readonly Recording[]>;
  readonly delete: (recording: readonly Recording[]) => Promise<readonly Recording[]>;
}

export function useRecordingsDB(): RecordingsDBHook {
  const database = useConstant(() => {
    return new Database();
  });

  const [cachedRecordings, setCachedRecordings] = useState<readonly Recording[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<Readonly<StorageEstimate> | undefined>()

  useEffect(() => {
    loadRecordings(database.recordings).then(setCachedRecordings);
    queryStorageStats().then(setStorageEstimate);
  }, [database.recordings]);

  return {
    storageEstimate,
    recordings: cachedRecordings,
    add(recordings: readonly Recording[]) {
      return Promise.all(
        recordings.map((recording) =>
          Promise.all([fetch(recording.url), fetch(recording.thumbnailUrl)])
            .then(([srcRes, thumbRes]) => Promise.all([srcRes.blob(), thumbRes.blob()]))
            .then(([srcBlob, thumbBlob]) => ({
              id: recording.databaseId,
              src: srcBlob,
              timestamp: recording.timestamp,
              filename: recording.filename,
              thumbnail: thumbBlob,
            }))
        )
      )
        .then((rows) =>
          database.transaction('rw', database.recordings, () => {
            database.recordings.bulkAdd(rows);
          })
        )
        .then(() => {
          loadRecordings(database.recordings).then(setCachedRecordings);
          queryStorageStats().then(setStorageEstimate);
          return recordings;
        });
    },
    delete(recordings: readonly Recording[]) {
      return database.recordings
        .bulkDelete(recordings.map((recording) => recording.databaseId))
        .then(() => {
          recordings.forEach((recording) => recording.revokeURLs());
          loadRecordings(database.recordings).then(setCachedRecordings);
          queryStorageStats().then(setStorageEstimate);
          return recordings;
        });
    },
    update(recordings: readonly Recording[]) {
      return database.transaction('rw', database.recordings, () =>
        Promise.all(
          recordings.map((recording) =>
            database.recordings.update(recording.databaseId, { filename: recording.filename })
          )
        ).then(() => {
          loadRecordings(database.recordings).then(setCachedRecordings);
          queryStorageStats().then(setStorageEstimate);
          return recordings;
        })
      );
    },
  };
}

function queryStorageStats(): Promise<Readonly<StorageEstimate>> {
  return navigator.storage.estimate();
}
