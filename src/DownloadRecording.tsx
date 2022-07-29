import { ReactNode, useCallback } from 'react';
import Recording from './Recording';
import { triggerBlobDownload } from './utilities';

export interface DownloadRecordingBtnProps extends React.HTMLProps<HTMLButtonElement> {
  recording: Readonly<Recording>;
  children?: ReactNode;
}

export default function DownloadRecordingBtn({
  recording,
  children,
  ...props
}: DownloadRecordingBtnProps) {
  const onClick = useCallback(
    function handleClick() {
      recording.getBlob().then((blob) => {
        triggerBlobDownload(blob, recording.filename);
      });
    },
    [recording]
  );

  return (
    <button
      title={`Download recording: ${recording.timestamp.toLocaleString()}`}
      aria-label={`Download recording: ${recording.timestamp.toLocaleString()}`}
      {...props}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
