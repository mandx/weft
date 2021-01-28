import { CSSProperties } from 'react';

import { classnames } from './utilities';
import { Range, Ranges } from './ranges';

import './RangesEditor.scss';

export type { Range, Ranges };

export interface RangeBlockProps {
  range: Range;
  min: number;
  max: number;
}

export function rangeStyle([start, end]: Range, min: number, max: number): CSSProperties {
  const rangeTotal = max - min;
  // console.log(start, end, min, max, `calc(100% - ${((end - min) * 100) / rangeTotal}%)`);
  return {
    left: `${((start - min) * 100) / rangeTotal}%`,
    right: `calc(100% - ${((end - min) * 100) / rangeTotal}%)`,
  };
}

function RangeBlock({ range, min, max }: RangeBlockProps) {
  // console.log(rangeStyle(range, min, max));
  return (
    <div className="range-editor-block" style={rangeStyle(range, min, max)}>
      <div className="range-editor-handle left" aria-label="Left handle" />
      {`${range[0]} - ${range[1]}`}
      <div className="range-editor-handle right" aria-label="Right handle" />
    </div>
  );
}

export interface RangesEditorProps {
  className?: string;
  ranges: Ranges;
  min?: number;
  max: number;
}

export default function RangesEditor({
  className,
  // ranges: initialRanges,
  ranges,
  min = 0,
  max,
}: RangesEditorProps) {
  // const [ranges /* setRanges */] = useState(initialRanges);
  return (
    <div className={classnames('ranges-editor-container', className)}>
      {ranges.map((range) => (
        <RangeBlock range={range} min={min} max={max} key={`${range[0]}:${range[1]}`} />
      ))}
    </div>
  );
}

/*
0 1
1 2
2 3
3 4
4 5
6 7
7 8
8 9
10 11
11 12
12 13
13 14
14 15
15 16
16 17
*/
