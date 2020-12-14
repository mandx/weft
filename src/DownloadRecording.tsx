import { ReactNode, useCallback } from 'react';
import Recording from './Recording';

export interface DownloadRecordingBtnProps extends React.HTMLProps<HTMLButtonElement> {
  recording: Recording;
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
        const blobUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.style.display = 'none';
        anchor.setAttribute('href', blobUrl);
        anchor.setAttribute('download', recording.filename);
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          document.body.removeChild(anchor);
        });
      });
    },
    [recording]
  );

  return (
    <button {...props} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
