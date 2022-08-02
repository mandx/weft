import { classnames, formatBytes } from './utilities';
import './StorageEstimateBar.scss';
import { useStorageEstimate } from './storage-swr';

export interface StorageEstimateBarProps {
  readonly className?: string;
}

export default function StorageEstimateBar({ className }: StorageEstimateBarProps) {
  const storageEstimate = useStorageEstimate();

  let meter = null;
  let content = null;
  switch (storageEstimate.status) {
    case 'error':
      content = (
        <span>
          <>Your browser did not report storage estimates: {storageEstimate.reason}</>
        </span>
      );
      break;
    case 'indeterminate':
      content = (
        <>
          <span>Your browser reported only partial storage estimates</span>
          <dl>
            {storageEstimate.estimate.usage !== undefined && (
              <>
                <dt>Usage</dt>
                <dd>{formatBytes(storageEstimate.estimate.usage)}</dd>
              </>
            )}
            {storageEstimate.estimate.quota !== undefined && (
              <>
                <dt>Quota</dt>
                <dd>{formatBytes(storageEstimate.estimate.quota)}</dd>
              </>
            )}
          </dl>
        </>
      );
      break;

    case 'loaded':
      content = (
        <>
          <dl>
            <dt>Usage</dt>
            <dd>{formatBytes(storageEstimate.estimate.usage)}</dd>
            <dt>Quota</dt>
            <dd>{formatBytes(storageEstimate.estimate.quota)}</dd>
          </dl>
        </>
      );
      meter = (
        <progress
          title="These are the estimated storage stats, as reported by your browser."
          max={storageEstimate.estimate.quota}
          value={storageEstimate.estimate.usage}
        ></progress>
      );
      break;

    default: /*'loading'*/
      content = <span>Loading storage estimates</span>;
      break;
  }

  return (
    <div className={classnames('storage-estimate-bar', className)}>
      {meter}
      {content}
    </div>
  );
}
