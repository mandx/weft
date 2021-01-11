import { useCallback, FormEvent, useState, useEffect } from 'react';

import { classnames } from './utilities';
import Recording from './Recording';
import { Link } from './Router';
import { useDebouncedValue } from './hooks';

import './RecordingSearch.scss';

export interface RecordingSearchProps {
  className?: string;
  recordings: readonly Recording[];
}

export default function RecordingSearch({ recordings, ...props }: RecordingSearchProps) {
  const [searchText, setSearchText] = useState('');
  const searchTerm = useDebouncedValue(searchText, 300);
  const [filteredRecordings, setFilteredRecordings] = useState<readonly Recording[] | undefined>(
    undefined
  );

  const onSearchInput = useCallback(function handleSearchInput(
    event: FormEvent<HTMLInputElement>
  ): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      setSearchText(target.value);
    }
  },
  []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredRecordings(
        recordings.filter((recording) => fuzzyMatch(searchTerm, recording.filename))
      );
    } else {
      setFilteredRecordings(undefined);
    }
  }, [recordings, searchTerm]);

  return (
    <section className={classnames('recording-search', props.className)}>
      {!!recordings.length && <input type="search" onInput={onSearchInput} value={searchText} />}
      {!filteredRecordings && !!recordings.length && (
        <div className="recent-recordings-container">
          <strong>Your most recent recordings:</strong>
          <ul className="recordings-list-compact">
            {recordings.map((recording) => (
              <li key={recording.databaseId}>
                <Link to={`/play/${recording.databaseId}`}>{recording.filename}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {filteredRecordings &&
        (filteredRecordings.length ? (
          <ul className="recordings-list-compact">
            {filteredRecordings.map((recording) => (
              <li key={recording.databaseId}>
                <Link to={`/play/${recording.databaseId}`}>{recording.filename}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <strong>No matches</strong>
        ))}
    </section>
  );
}

export function fuzzyMatch(needle: string, haystack: string): boolean {
  const hlen = haystack.length;
  const nlen = needle.length;

  if (nlen > hlen) {
    return false;
  }

  if (nlen === hlen) {
    return needle === haystack;
  }

  outer: for (let i = 0, j = 0; i < nlen; i++) {
    const nch = needle.charCodeAt(i);
    while (j < hlen) {
      if (haystack.charCodeAt(j++) === nch) {
        continue outer;
      }
    }

    return false;
  }

  return true;
}
