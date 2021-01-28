import { clamp } from './utilities';

// export class Ranges {
//   private maxEnd: number;
//   private ranges: [start: number, end: number][] = [];

//   constructor(maxEnd: number) {
//     this.maxEnd = maxEnd;
//   }

//   add(start: number, end: number): void {
//     start = clamp(start, 0, this.maxEnd);
//     end = clamp(end, 0, this.maxEnd);

//     if (start > end) {
//       const tmp = start;
//       start = end;
//       end = tmp;
//     }

//     this.ranges.push([start, end]);
//   }
// }

export type Range = readonly [start: number, end: number];
export type Ranges = readonly Range[];

// export function fixupRange([start, end]: Range): Range {
//   start = clamp(start, 0, this.maxEnd);
//   end = clamp(end, 0, this.maxEnd);

//   if (start > end) {
//     const tmp = start;
//     start = end;
//     end = tmp;
//   }

//   return [start, end];
// }

export function clampRange([start, end]: Range, ranges: Ranges): Range {
  const rangesStart = ranges[0][0];
  const rangesEnd = ranges[ranges.length - 1][1];
  return [clamp(start, rangesStart, rangesEnd), clamp(end, rangesStart, rangesEnd)];
}

export function inRange(value: number, [start, end]: Range): boolean {
  return start <= value && value <= end;
}

export function overlap([start, end]: Range, other: Range): boolean {
  return inRange(start, other) || inRange(end, other);
}

export function merge(one: Range, two: Range): Range[] {
  if (overlap(one, two)) {
    return [[Math.min(one[0], two[0]), Math.max(one[1], two[1])]];
  }

  // No overlap; return both ranges, in order
  if (one[0] > two[0]) {
    return [two, one];
  }

  return [one, two];
}

export function rangeCmp(a: Range, b: Range): number {
  const cmp = a[0] - b[0];

  if (cmp === 0) {
    return a[1] - b[1];
  }

  return cmp;
}

export function addRange(_ranges: Ranges, rangeToAdd: Range): Ranges {
  type RangeMut = [start: number, end: number];
  type RangesMut = RangeMut[];

  const ranges: RangesMut = Array.from(_ranges).concat([rangeToAdd]) as RangesMut;
  if (ranges.length < 2) {
    return ranges;
  }

  ranges.sort(rangeCmp);

  let index = 0;
  while (index < ranges.length - 1) {
    if (overlap(ranges[index], ranges[index + 1])) {
      ranges.splice(index, 2, [
        Math.min(ranges[index][0], ranges[index + 1][0]),
        Math.max(ranges[index][1], ranges[index + 1][1]),
      ]);
    } else {
      index++;
    }
  }

  return ranges;
}

export function parseRangesText(text: string): Ranges {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => !!l.length)
    .map((l) => l.replace('s{2,}', ' ').split(' ').map(parseFloat))
    .filter((range) => !isNaN(range[0]) && !isNaN(range[1]))
    .map((range) => [range[0], range[1]]);
}
