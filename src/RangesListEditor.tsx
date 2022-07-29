import { Range, mergeMany as mergeRanges, make as makeRange } from './ranges';
import { v4 as uuidV4 } from 'uuid';
import { useCallback, useState } from 'react';
import { Range as RangeSlider, getTrackBackground } from 'react-range';
import { IRenderThumbParams, IRenderTrackParams } from 'react-range/lib/types';
import { ReactComponent as BookmarkPlusIcon } from 'bootstrap-icons/icons/bookmark-plus.svg';
import { ReactComponent as BookmarkXIcon } from 'bootstrap-icons/icons/bookmark-x.svg';
import { ReactComponent as BookmarksIcon } from 'bootstrap-icons/icons/bookmarks.svg';

import './RangesListEditor.scss';

export { type Range, makeRange };

type UuuidRange = Range & { readonly uuid: string };

function makeUuuidRange(
  start: number,
  end: number,
  uuid: string | (() => string) = uuidV4
): Readonly<UuuidRange> {
  return Object.assign(makeRange(start, end), { uuid: typeof uuid === 'function' ? uuid() : uuid });
}

function rangeToUuidRange(
  [start, end]: Range,
  uuid: string | (() => string) = uuidV4
): ReturnType<typeof makeUuuidRange> {
  return makeUuuidRange(start, end, uuid);
}

function asMappingFunc<T, U>(f: (x: T) => U): (x: T, _index: number, _array: readonly T[]) => U {
  return function mapper(x: T, _index: number, _array: readonly T[]): U {
    return f(x);
  };
}

interface RangeItemProps {
  range: UuuidRange;
  max: number;
  onChange: (range: UuuidRange) => void;
  onRemove: (range: UuuidRange) => void;
}

function renderRangeItemThumb({ props, isDragged }: IRenderThumbParams) {
  return (
    <div {...props} className="ranges-list-editor-range-item-thumb" style={props.style}>
      <div
        style={{
          height: '16px',
          width: '5px',
          backgroundColor: isDragged ? '#000' : '#CCC',
        }}
      />
    </div>
  );
}

function renderRangeItemTrack(
  range: UuuidRange,
  max: number,
  { props, children }: IRenderTrackParams
) {
  return (
    <div
      className="ranges-list-editor-range-item-track"
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}
      style={props.style}
    >
      <div
        ref={props.ref}
        className="ranges-list-editor-range-item-track-range"
        style={{
          background: getTrackBackground({
            values: [range[0], range[1]],
            colors: ['#fff', '#999', '#fff'],
            min: 0,
            max,
          }),
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RangeItem({ range, max, onChange, onRemove }: RangeItemProps) {
  const onRangeSliderChanged = useCallback(
    function onRangeSliderChangeHandler([s, e]: number[]): void {
      onChange(makeUuuidRange(s, e, range.uuid));
    },
    [onChange, range.uuid]
  );

  const onRemoveClick = useCallback(
    function onRemoveClicked() {
      onRemove(range);
    },
    [range, onRemove]
  );

  return (
    <li className="ranges-list-editor-range-item">
      <div className="ranges-list-editor-range-item-slider-container">
        <RangeSlider
          draggableTrack
          values={range as unknown as number[]}
          renderThumb={renderRangeItemThumb}
          renderTrack={(params) => renderRangeItemTrack(range, max, params)}
          min={0}
          onChange={onRangeSliderChanged}
          max={max}
        />
      </div>
      <div className="ranges-list-editor-range-item-actions-container">
        <button className="btn" type="button" onClick={onRemoveClick} title="Remove">
          <BookmarkXIcon className="btn-icon" />
          {/*<span className="btn-text">Remove</span>*/}
        </button>
      </div>
    </li>
  );
}

interface RangesListEditorProps {
  beforeButtons?: JSX.Element;
  afterButtons?: JSX.Element;
  initialRanges: readonly Range[];
  max: number;
  onSliderThumbChange: (value: number) => void;
  onRangesChanged?: (value: readonly Range[]) => void;
  onMergedRangesChanged?: (value: readonly Range[]) => void;
}

export default function RangesListEditor({
  beforeButtons,
  afterButtons,
  max,
  initialRanges,
  onSliderThumbChange,
  onRangesChanged,
  onMergedRangesChanged,
}: RangesListEditorProps) {
  const [ranges, setRanges] = useState<readonly UuuidRange[]>(
    initialRanges.map(asMappingFunc(rangeToUuidRange))
  );

  const addRangeClicked = useCallback(
    function addRangeClickHandler() {
      setRanges((ranges) => [makeUuuidRange(0, max), ...ranges]);
    },
    [max]
  );

  const mergeRangeClicked = useCallback(function mergeRangeClickHandler() {
    setRanges((ranges) => mergeRanges(ranges).map(asMappingFunc(rangeToUuidRange)));
  }, []);

  const onRangeChanged = useCallback(
    function rangeSliderChangeHandler(range: UuuidRange): void {
      setRanges((ranges) => {
        const newRanges = ranges.map((r) => {
          if (r.uuid === range.uuid) {
            onSliderThumbChange(r[0] !== range[0] ? r[0] : r[1]);
            return range;
          }
          return r;
        });
        // We neeed to fire callbacks in the next tick, because the callback's
        // code could also be updating state in another component.
        // See https://github.com/facebook/react/issues/18178#issuecomment-595846312
        setTimeout(() => {
          onRangesChanged?.(newRanges);
          onMergedRangesChanged?.(mergeRanges(newRanges));
        }, 0);
        return newRanges;
      });
    },
    [onSliderThumbChange, onRangesChanged, onMergedRangesChanged]
  );

  const onRemoveRange = useCallback(
    function onRemoveRangeHandler(range: UuuidRange) {
      setRanges((ranges) => {
        const newRanges = ranges.filter((r) => r.uuid !== range.uuid);
        // We neeed to fire callbacks in the next tick, because the callback's
        // code could also be updating state in another component.
        // See https://github.com/facebook/react/issues/18178#issuecomment-595846312
        setTimeout(() => {
          onRangesChanged?.(newRanges);
          onMergedRangesChanged?.(mergeRanges(newRanges));
        }, 0);
        return newRanges;
      });
    },
    [onRangesChanged, onMergedRangesChanged]
  );

  return (
    <div className="ranges-list-editor">
      <div className="ranges-list-editor-toolbar">
        {beforeButtons}

        <button className="btn" type="button" onClick={addRangeClicked}>
          <BookmarkPlusIcon className="btn-icon" />
          <span className="btn-text">Add</span>
        </button>

        <button className="btn" type="button" onClick={mergeRangeClicked}>
          <BookmarksIcon className="btn-icon" />
          <span className="btn-text">Merge</span>
        </button>

        {afterButtons}
      </div>
      <ul className="ranges-list-editor-ranges-container">
        {ranges.map((range) => (
          <RangeItem
            key={range.uuid}
            range={range}
            max={max}
            onChange={onRangeChanged}
            onRemove={onRemoveRange}
          />
        ))}
      </ul>
    </div>
  );
}
