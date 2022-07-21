import { useState, useEffect, createContext, useCallback } from 'react';
import DexieDB from 'dexie';

import { useConstant } from './hooks';
import Recording, { BlobResolver, DatabaseID } from './Recording';

export interface RecordingRow {
  readonly id: DatabaseID;
  readonly src: Blob;
  readonly timestamp: Date;
  readonly filename: string;
  readonly thumbnail: Blob;
}

export class Database extends DexieDB {
  public recordings: DexieDB.Table<RecordingRow, DatabaseID>;

  constructor() {
    super('Weft');
    this.version(1).stores({
      recordings: '&id,timestamp,filename',
    });
    this.recordings = this.table('recordings');
  }
}

type KeyOfType<T, V> = keyof {
  [P in keyof T as T[P] extends V ? P : never]: unknown;
};

function createDatabaseBlobResolver(
  recordingsTable: DexieDB.Table<RecordingRow, DatabaseID>,
  rowId: DatabaseID,
  fieldName: KeyOfType<RecordingRow, Blob>
): BlobResolver {
  return function dbBlobResolver() {
    return recordingsTable
      .where({ ':id': rowId })
      .toArray()
      .then((items) => {
        if (!items.length) {
          throw new Error(`No items found for database ID «${rowId}»`);
        }

        return items[0][fieldName];
      });
  };
}

function loadRecordings(
  recordingsTable: DexieDB.Table<RecordingRow, DatabaseID>
): Promise<Recording[]> {
  return recordingsTable
    .orderBy('timestamp')
    .reverse()
    .toArray()
    .then((items) =>
      items.map(
        (item) =>
          new Recording(
            createDatabaseBlobResolver(recordingsTable, item.id, 'src'),
            createDatabaseBlobResolver(recordingsTable, item.id, 'thumbnail'),
            {
              filename: item.filename,
              databaseId: item.id,
            }
          )
      )
    );
}

export interface RecordingsStorage {
  readonly storageEstimate?: Readonly<StorageEstimate>;
  readonly recordings: readonly Readonly<Recording>[];
  readonly add: (
    recordings: readonly Readonly<Recording>[]
  ) => Promise<readonly Readonly<Recording>[]>;
  readonly update: (
    recordings: readonly Readonly<Recording>[]
  ) => Promise<readonly Readonly<Recording>[]>;
  readonly delete: (
    recording: readonly Readonly<Recording>[]
  ) => Promise<readonly Readonly<Recording>[]>;
}

function queryStorageStats(): Promise<Readonly<StorageEstimate>> {
  return navigator.storage.estimate();
}

export function useRecordingsStorage(): RecordingsStorage {
  const database = useConstant(() => new Database());

  const [cachedRecordings, setCachedRecordings] = useState<readonly Readonly<Recording>[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<Readonly<StorageEstimate> | undefined>();

  const refreshCache = useCallback(
    function refreshCacheCb() {
      console.warn('Reloading recordings from IndexedDB...');
      return Promise.all([loadRecordings(database.recordings), queryStorageStats()]).then(
        ([recordings, storageEstimate]) => {
          console.warn(
            'Reloaded recordings from IndexedDB',
            recordings.map((r) => r.databaseId)
          );
          setCachedRecordings(recordings);
          setStorageEstimate(storageEstimate);
        }
      );
    },
    [database, setCachedRecordings, setStorageEstimate]
  );

  useEffect(() => {
    refreshCache();
  }, [refreshCache]);

  return {
    storageEstimate,
    recordings: cachedRecordings,
    add(recordings: readonly Readonly<Recording>[]) {
      return Promise.all(
        recordings.map((recording) =>
          Promise.all([recording.getBlob(), recording.getThumbnailBlob()]).then(
            ([srcBlob, thumbBlob]) => ({
              id: recording.databaseId,
              src: srcBlob,
              timestamp: recording.timestamp,
              filename: recording.filename,
              thumbnail: thumbBlob,
            })
          )
        )
      )
        .then((rows) =>
          database.transaction('rw', database.recordings, () => database.recordings.bulkAdd(rows))
        )
        .then(refreshCache)
        .then(() => recordings);
    },
    delete(recordings: readonly Readonly<Recording>[]) {
      return database.recordings
        .bulkDelete(recordings.map((recording) => recording.databaseId))
        .then(() => refreshCache())
        .then(() => recordings);
    },
    update(recordings: readonly Readonly<Recording>[]) {
      return database.transaction('rw', database.recordings, () =>
        Promise.all(
          recordings.map((recording) =>
            database.recordings.update(recording.databaseId, { filename: recording.filename })
          )
        )
          .then(refreshCache)
          .then(() => recordings)
      );
    },
  };
}

export const RecordingsStorageContext = createContext<
  ReturnType<typeof useRecordingsStorage> | undefined
>(undefined);
