import { useCallback } from 'react';
import DexieDB from 'dexie';
import useSWR, { mutate as mutateGlobal } from 'swr';

import { useConstant } from './hooks';
import Recording, { BlobResolver, DatabaseID } from './Recording';
import { noop } from './utilities';

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

export function queryStorageStats(): Promise<Readonly<StorageEstimate>> {
  return navigator.storage.estimate();
}

const STORAGE_ESTIMATE_SWR_KEY = 'storage_estimate';

export function useStorageEstimate():
  | { status: 'loading' }
  | { status: 'loaded'; estimate: Readonly<StorageEstimate> }
  | { status: 'error'; reason: unknown } {
  const { data, error } = useSWR<Readonly<StorageEstimate>, unknown>(
    STORAGE_ESTIMATE_SWR_KEY,
    () => {
      return queryStorageStats();
    }
  );

  if (error) {
    return { status: 'error', reason: error };
  }

  if (data) {
    return { status: 'loaded', estimate: data };
  }

  return { status: 'loading' };
}

export interface RecordingsStorage {
  readonly data:
    | { readonly status: 'loaded'; readonly list: readonly Readonly<Recording>[] }
    | { readonly status: 'loading' }
    | { readonly status: 'error'; readonly reason: unknown };

  readonly add: (recordings: readonly Readonly<Recording>[]) => Promise<void>;
  readonly update: (recordings: readonly Readonly<Recording>[]) => Promise<void>;
  readonly delete: (recording: readonly Readonly<Recording>[]) => Promise<void>;
}

const RECORDINGS_SWR_KEY = 'recordings';

export function useRecordings(): RecordingsStorage {
  const database = useConstant(() => new Database());

  const {
    data: recordings,
    error,
    mutate: mutateRecordings,
  } = useSWR<readonly Readonly<Recording>[], unknown>(
    RECORDINGS_SWR_KEY,
    function recordingsFetcher() {
      return loadRecordings(database.recordings);
    }
  );

  const addFn = useCallback(
    function addRecording(newRecordings: readonly Readonly<Recording>[]) {
      return mutateRecordings(
        Promise.all(
          newRecordings.map((recording) =>
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
          .then(() => []),
        {
          revalidate: true,
          rollbackOnError: true,
          populateCache: false,
          optimisticData: newRecordings.concat(recordings || []),
        }
      )
        .then(() => mutateGlobal(STORAGE_ESTIMATE_SWR_KEY))
        .then(noop);
    },
    [database, mutateRecordings, recordings]
  );

  const deleteFn = useCallback(
    function deleteRecording(recordingsToDelete: readonly Readonly<Recording>[]) {
      const idsToDelete = new Set(recordingsToDelete.map((r) => r.databaseId));
      return mutateRecordings(
        database
          .transaction('rw', database.recordings, () =>
            database.recordings.bulkDelete([...idsToDelete])
          )
          .then(() => []),
        {
          revalidate: true,
          rollbackOnError: true,
          populateCache: false,
          optimisticData: recordings && recordings.filter((r) => !idsToDelete.has(r.databaseId)),
        }
      )
        .then(() => mutateGlobal(STORAGE_ESTIMATE_SWR_KEY))
        .then(noop);
    },
    [database, mutateRecordings, recordings]
  );

  const updateFn = useCallback(
    function updateRecording(recordingsToUpdate: readonly Readonly<Recording>[]) {
      const idMap = Object.fromEntries(recordingsToUpdate.map((r) => [r.databaseId, r]));
      return mutateRecordings(
        database
          .transaction('rw', database.recordings, () =>
            Promise.all(
              recordingsToUpdate.map((recording) =>
                database.recordings.update(recording.databaseId, { filename: recording.filename })
              )
            )
          )
          .then(() => []),
        {
          revalidate: true,
          rollbackOnError: true,
          populateCache: false,
          optimisticData: recordings && recordings.map((r) => idMap[r.databaseId] || r),
        }
      )
        .then(() => mutateGlobal(STORAGE_ESTIMATE_SWR_KEY))
        .then(noop);
    },
    [database, mutateRecordings, recordings]
  );

  return {
    data: (() => {
      if (error) {
        return { status: 'error', reason: error };
      }

      if (recordings) {
        return { status: 'loaded', list: recordings };
      }

      return { status: 'loading' };
    })(),
    add: addFn,
    delete: deleteFn,
    update: updateFn,
  };
}
