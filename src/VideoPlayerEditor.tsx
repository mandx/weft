import { classnames } from './utilities';
import VideoElement from './VideoElement';
import './VideoPlayerEditor.scss';

export interface VideoPlayerEditorProps {
  className?: string;
  src: string;
}

export default function VideoPlayerEditor({ className, src }: VideoPlayerEditorProps) {
  return (
    <div className={classnames('video-player-editor', className)}>
      <VideoElement
        src={src}
        className="video-player"
        controls
        autoPlay={false}
        preload="metadata"
      />
    </div>
  );
}
