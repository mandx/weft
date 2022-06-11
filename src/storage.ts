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

function createDatabaseBlobResolver(
  recordingsTable: DexieDB.Table<RecordingRow, DatabaseID>,
  rowId: DatabaseID
): BlobResolver {
  return function dbBlobResolver() {
    return recordingsTable
      .where({ ':id': rowId })
      .toArray()
      .then((items) => {
        if (!items.length) {
          throw new Error(`No items found for database ID «${rowId}»`);
        }

        return items[0].src;
      });
  };
}

function loadRecordings(
  recordingsTable: DexieDB.Table<RecordingRow, DatabaseID>
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
              new Recording(createDatabaseBlobResolver(recordingsTable, item.id), item.thumbnail, {
                filename: item.filename,
                databaseId: item.id,
              })
          )
        );
      }, reject);
  });
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

export function useRecordingsStorage(): RecordingsStorage {
  const database = useConstant(() => new Database());

  const [cachedRecordings, setCachedRecordings] = useState<readonly Readonly<Recording>[]>([]);
  const [storageEstimate, setStorageEstimate] = useState<Readonly<StorageEstimate> | undefined>();

  const refreshCache = useCallback(
    function refreshCacheCb() {
      return Promise.all([loadRecordings(database.recordings), queryStorageStats()]).then(
        ([recordings, storageEstimate]) => {
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
          fetch(recording.thumbnailUrl)
            .then((thumbRes) => Promise.all([recording.getBlob(), thumbRes.blob()]))
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
        .then(refreshCache)
        .then(() => recordings);
    },
    delete(recordings: readonly Readonly<Recording>[]) {
      return database.recordings
        .bulkDelete(recordings.map((recording) => recording.databaseId))
        .then(() => {
          recordings.forEach((recording) => recording.revokeURLs());
          return refreshCache();
        })
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

function queryStorageStats(): Promise<Readonly<StorageEstimate>> {
  return navigator.storage.estimate();
}

export const RecordingsStorageContext = createContext<
  ReturnType<typeof useRecordingsStorage> | undefined
>(undefined);
