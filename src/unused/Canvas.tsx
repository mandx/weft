import { forwardRef, useRef, useEffect, useLayoutEffect, useState, HTMLProps } from 'react';

import { useCombinedRefs } from '../hooks';

const Canvas = forwardRef<HTMLCanvasElement, HTMLProps<HTMLCanvasElement>>(function CanvasRenderer(
  { style, className, ...props },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLCanvasElement | null>(null);
  const combinedRef = useCombinedRefs(ref, innerRef);

  const [clientHeight, setClientHeight] = useState(200);
  const [clientWidth, setClientWidth] = useState(200);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const canvas = combinedRef.current;
    if (container && canvas) {
      setClientHeight(container.clientHeight);
      setClientWidth(container.clientWidth);
    }
  }, [containerRef, combinedRef]);

  useEffect(() => {
    function resizeListener() {
      const container = containerRef.current;
      const canvas = combinedRef.current;
      if (container && canvas) {
        setClientHeight(container.clientHeight);
        setClientWidth(container.clientWidth);
      }
    }

    window.addEventListener('resize', resizeListener);
    return function unSubscribeResizeListener() {
      window.removeEventListener('resize', resizeListener);
    };
  }, [containerRef, combinedRef]);

  return (
    <div style={style} ref={containerRef} className={className}>
      <canvas
        {...props}
        width={clientWidth}
        height={clientHeight}
        ref={combinedRef}
        className={className && `${className}-wrapped-canvas`}
      />
    </div>
  );
});

export default Canvas;
