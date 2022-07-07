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

export function clampRange([start, end]: Range, ranges: readonly Range[]): Range {
  const rangesStart = ranges[0][0];
  const rangesEnd = ranges[ranges.length - 1][1];
  return make(clamp(start, rangesStart, rangesEnd), clamp(end, rangesStart, rangesEnd));
}

export function inRange(value: number, [start, end]: Range): boolean {
  return start <= value && value <= end;
}

// TODO: Rename this function
export function inRanges(
  value: number,
  ranges: readonly Range[]
): { in: true; currentRange: Range } | { in: false; nextRange: Range | undefined } {
  const future = [];
  for (const r of ranges) {
    if (inRange(value, r)) {
      return { in: true, currentRange: r };
    }
    if (r[0] > value) {
      future.push(r);
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
  switch (ranges.length) {
    case 0:
    case 1:
      return result;

    case 2:
      return merge(ranges[0], ranges[1]);

    default: {
      result.sort(rangeCmp);

      let position = 0;
      while (position < ranges.length) {
        let accumulator = result.splice(position, 1)[0];
        if (!accumulator) {
          break;
        }

        while (true) {
          const current = result.splice(position, 1)[0];
          if (!current) {
            result.splice(position, 0, accumulator);
            break;
          }

          const merged = merge(accumulator, current);
          if (merged.length === 2) {
            result.splice(position, 0, ...merged);
            break;
          } else {
            accumulator = merged[0];
          }
        }
        position++;
      }

      return result;
    }
  }
}

export function rangeCmp(a: Range, b: Range): number {
  const cmp = a[0] - b[0];

  if (cmp === 0) {
    return a[1] - b[1];
  }

  return cmp;
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

export function parseRangesText(text: string): Range[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !!l.length)
    .map((l) => l.replace('s{2,}', ' ').split(' ').map(parseFloat))
    .filter((range) => !isNaN(range[0]) && !isNaN(range[1]))
    .map((range) => make(range[0], range[1]));
}
