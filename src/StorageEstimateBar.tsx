import './StorageEstimateBar.scss';

export interface StorageEstimateBarProps {
  readonly className?: string;
  readonly estimate: StorageEstimate;
}

export default function StorageEstimateBar({ className, estimate }: StorageEstimateBarProps) {
  return (
    <meter
      title="These are the estimated storage stats, as reported by your browser."
      className={`storage-estimate-bar ${className || ''}`}
      min={0}
      max={estimate.quota}
      value={estimate.usage}></meter>
  );
}
