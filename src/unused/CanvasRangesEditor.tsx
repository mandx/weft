import { useCallback, useRef, useEffect } from 'react';

import { Range, Ranges } from '../ranges';
export type { Range, Ranges };

export interface CanvasRangesEditorProps {
  duration: number;
  ranges: Ranges;
  seekTo?: (time: number) => void;
}

export default function CanvasRangesEditor({ duration, seekTo }: CanvasRangesEditorProps) {
  const canvasHeight = 20;
  const canvasWidth = 1000 * duration;
  const dragging = useRef<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawLineAndSeek = useCallback(
    function (clientX: number): void {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (isNaN(clientX)) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const elementX = clientX - rect.left;

      if (seekTo && duration) {
        seekTo((elementX * duration) / rect.width);
      }

      const canvasX = (elementX * canvasWidth) / rect.width;
      // const y = event.clientY - rect.top;

      context.strokeStyle = 'black';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(canvasX, 0);
      context.lineTo(canvasX, canvasHeight);
      context.stroke();
    },
    [duration]
  );

  const canvasMouseUp = useCallback(function canvasMouseUpCb(_event: globalThis.MouseEvent): void {
    dragging.current = false;
  }, []);

  const mouseMoved = useCallback(
    function canvasMouseMoveCb(event: MouseEvent): void {
      if (dragging.current) {
        drawLineAndSeek(event.clientX);
      }
    },
    [drawLineAndSeek]
  );

  const canvasMouseDown = useCallback(
    function canvasMouseDownCb<T>(event: React.MouseEvent<T>): void {
      dragging.current = true;
      drawLineAndSeek(event.clientX);
    },
    [drawLineAndSeek]
  );

  // onMouseUp={canvasMouseUp}
  // onMouseMove={mouseMoved}

  useEffect(() => {
    drawLineAndSeek(NaN);
    document.addEventListener('mousemove', mouseMoved);
    document.addEventListener('mouseup', canvasMouseUp);
    return () => {
      document.removeEventListener('mousemove', mouseMoved);
      document.removeEventListener('mouseup', canvasMouseUp);
    };
  }, [mouseMoved, canvasMouseUp, drawLineAndSeek]);

  return (
    <canvas
      ref={canvasRef}
      height={canvasHeight}
      width={canvasWidth}
      onMouseDown={canvasMouseDown}
      className="video-timeline"
    />
  );
}
