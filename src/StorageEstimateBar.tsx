import './StorageEstimateBar.scss';

export interface StorageEstimateBarProps {
  readonly className?: string;
  readonly estimate: StorageEstimate;
}

export default function StorageEstimateBar({ className, estimate }: StorageEstimateBarProps) {
  return (
    <meter
      className={`storage-estimate-bar ${className || ''}`}
      min={0}
      max={estimate.quota}
      value={estimate.usage}></meter>
  );
}
