import { classnames, formatBytes } from './utilities';
import './StorageEstimateBar.scss';

export interface StorageEstimateBarProps {
  readonly className?: string;
  readonly estimate: StorageEstimate;
}

export default function StorageEstimateBar({ className, estimate }: StorageEstimateBarProps) {
  const { quota, usage } = estimate;

  return (
    <div className={classnames('storage-estimate-bar', className)}>
      <meter
        title="These are the estimated storage stats, as reported by your browser."
        min={0}
        max={quota}
        value={usage}></meter>

      <dl>
        {usage !== undefined && (
          <>
            <dt>Usage</dt>
            <dd>{formatBytes(usage)}</dd>
          </>
        )}
        {quota !== undefined && (
          <>
            <dt>Quota</dt>
            <dd>{formatBytes(quota)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
