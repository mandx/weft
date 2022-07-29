import { clamp } from './utilities';

export type Range = readonly [start: number, end: number] & {
  readonly __brand: unique symbol;
};

export function make(start: number, end: number): Range {
  if (isNaN(start)) {
    throw new TypeError('`start` is Not-A-Number');
  }
  if (isNaN(end)) {
    throw new TypeError('`end` is Not-A-Number');
  }

  return [Math.min(start, end), Math.max(start, end)] as unknown as Range;
}

export function transform(
  ranges: readonly Range[],
  transformer: (value: number, index: number, edge: 'start' | 'end') => number
): Range[] {
  return ranges.map(([start, end], index) =>
    make(transformer(start, index, 'start'), transformer(end, index, 'end'))
  );
}

export function clampRange([start, end]: Range, ranges: readonly Range[]): Range {
  const rangesStart = ranges[0][0];
  const rangesEnd = ranges[ranges.length - 1][1];
  return make(clamp(start, rangesStart, rangesEnd), clamp(end, rangesStart, rangesEnd));
}

export function inRange(value: number, [start, end]: Range): boolean {
  return start <= value && value <= end;
}

/**
 * Finds and returns the range a value is inside of. If no range can be found,
 * then it will return the closest range in the future.
 */
export function closest(
  value: number,
  ranges: readonly Range[]
): { in: true; range: Range } | { in: false; nextRange: Range | undefined } {
  const future = [];
  for (const range of ranges) {
    if (inRange(value, range)) {
      return { in: true, range };
    }
    if (range[0] > value) {
      future.push(range);
    }
  }
  future.sort(rangeCmp);
  return { in: false, nextRange: future[0] };
}

export function overlap(first: Range, second: Range): boolean {
  return (
    inRange(first[0], second) ||
    inRange(first[1], second) ||
    inRange(second[0], first) ||
    inRange(second[1], first)
  );
}

export function merge(one: Range, two: Range): Range[] {
  if (overlap(one, two)) {
    return [make(Math.min(one[0], two[0]), Math.max(one[1], two[1]))];
  }
  const result = [one, two];
  result.sort(rangeCmp);
  return result;
}

export function mergeMany(ranges: readonly Range[]): Range[] {
  const result: Range[] = ranges.concat([]);
  result.sort(rangeCmp);

  let position = 0;
  while (true) {
    const tip = result.splice(position, 2);
    if (tip.length < 2) {
      result.splice(position, 0, ...tip);
      break;
    }

    const [one, two] = tip;
    const merged = merge(one, two);
    result.splice(position, 0, ...merged);
    if (merged.length > 1) {
      position++;
    }
  }

  return result;
}

export function rangeCmp([aStart, aEnd]: Range, [bStart, bEnd]: Range): number {
  const cmp = aStart - bStart;
  return cmp === 0 ? Math.sign(aEnd - bEnd) : Math.sign(cmp);
}

export function addRange(_ranges: readonly Range[], rangeToAdd: Range): Range[] {
  const ranges = _ranges.concat([rangeToAdd]);
  if (ranges.length < 2) {
    return ranges;
  }

  ranges.sort(rangeCmp);

  let index = 0;
  while (index < ranges.length - 1) {
    if (overlap(ranges[index], ranges[index + 1])) {
      ranges.splice(
        index,
        2,
        make(
          Math.min(ranges[index][0], ranges[index + 1][0]),
          Math.max(ranges[index][1], ranges[index + 1][1])
        )
      );
    } else {
      index++;
    }
  }

  return ranges;
}
