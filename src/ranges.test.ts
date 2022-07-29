import { closest, make, merge, mergeMany, overlap, transform } from './ranges';

describe('make', () => {
  it('should create ranges with proper start/end', () => {
    expect(make(0, 0)).toEqual([0, 0]);
    expect(make(0, 1)).toEqual([0, 1]);
    expect(make(1, 0)).toEqual([0, 1]);
    expect(make(1, 1)).toEqual([1, 1]);
    expect(make(-1, 1)).toEqual([-1, 1]);
    expect(make(1, -1)).toEqual([-1, 1]);

    expect(make(0, 1.5)).toEqual([0, 1.5]);
  });

  it('should reject NaNs', () => {
    expect(make.bind(undefined, 0, Number('nans'))).toThrow();
    expect(make.bind(undefined, Number('nans'), 0)).toThrow();
  });

  it('should accept Infinities', () => {
    expect(make(0, Infinity)).toEqual([0, Infinity]);
    expect(make(-Infinity, 0)).toEqual([-Infinity, 0]);
    expect(make(-Infinity, Infinity)).toEqual([-Infinity, Infinity]);
  });
});

describe('overlap', () => {
  it('overlapping', () => {
    expect(overlap(make(0, 1.5), make(1, 2))).toBe(true);
    expect(overlap(make(1, 2), make(0, 1.5))).toBe(true);
    expect(overlap(make(1, 2), make(1.5, Infinity))).toBe(true);
  });

  it('non-overlapping', () => {
    expect(overlap(make(0, 1.5), make(2, 2.5))).toBe(false);
    expect(overlap(make(2, 2.5), make(0, 1.5))).toBe(false);
    expect(overlap(make(2, Infinity), make(0, 1.5))).toBe(false);
    expect(overlap(make(2, 2.5), make(-Infinity, 1.5))).toBe(false);
  });

  it('containing', () => {
    expect(overlap(make(0, 3), make(2, 2.5))).toBe(true);
    expect(overlap(make(2, 2.5), make(0, 3))).toBe(true);
    expect(overlap(make(2, 2.5), make(-Infinity, 3))).toBe(true);
    expect(overlap(make(2, 2.5), make(0, Infinity))).toBe(true);
  });
});

describe('merge', () => {
  it('should merge two overlapping ranges', () => {
    expect(merge(make(0, 1.5), make(1, 2))).toEqual([[0, 2]]);
    expect(merge(make(1, 2), make(0, 1.5))).toEqual([[0, 2]]);
    expect(merge(make(1, Infinity), make(0, 1.5))).toEqual([[0, Infinity]]);
    expect(merge(make(-Infinity, 1.5), make(1, 2))).toEqual([[-Infinity, 2]]);
  });

  it('should just return the same two non-overlapping ranges', () => {
    expect(merge(make(0, 1.5), make(2, 2.5))).toEqual([
      [0, 1.5],
      [2, 2.5],
    ]);
    expect(merge(make(2, 2.5), make(0, 1.5))).toEqual([
      [0, 1.5],
      [2, 2.5],
    ]);
    expect(merge(make(-Infinity, 1.5), make(2, 2.5))).toEqual([
      [-Infinity, 1.5],
      [2, 2.5],
    ]);
    expect(merge(make(2, Infinity), make(0, 1.5))).toEqual([
      [0, 1.5],
      [2, Infinity],
    ]);
  });

  it('should merge two ranges when one contains the other', () => {
    expect(merge(make(0, 3), make(2, 2.5))).toEqual([[0, 3]]);
    expect(merge(make(2, 2.5), make(0, 3))).toEqual([[0, 3]]);
    expect(merge(make(0, Infinity), make(2, 2.5))).toEqual([[0, Infinity]]);
    expect(merge(make(2, 2.5), make(-Infinity, 3))).toEqual([[-Infinity, 3]]);
  });
});

describe('mergeMany', () => {
  describe('handling zero or one elements', () => {
    it('should just the same arrays if they contain 0 or 1 elements', () => {
      expect(mergeMany([])).toEqual([]);
      expect(mergeMany([make(1, 2)])).toEqual([[1, 2]]);
    });
  });

  describe('handling two elements', () => {
    it('should merge two overlapping ranges', () => {
      expect(mergeMany([make(0, 1.5), make(1, 2)])).toEqual([[0, 2]]);
      expect(mergeMany([make(1, 2), make(0, 1.5)])).toEqual([[0, 2]]);
      expect(mergeMany([make(1, Infinity), make(0, 1.5)])).toEqual([[0, Infinity]]);
      expect(mergeMany([make(-Infinity, 1.5), make(1, 2)])).toEqual([[-Infinity, 2]]);
    });

    it('should just return the same two non-overlapping ranges', () => {
      expect(mergeMany([make(0, 1.5), make(2, 2.5)])).toEqual([
        [0, 1.5],
        [2, 2.5],
      ]);
      expect(mergeMany([make(2, 2.5), make(0, 1.5)])).toEqual([
        [0, 1.5],
        [2, 2.5],
      ]);
      expect(mergeMany([make(-Infinity, 1.5), make(2, 2.5)])).toEqual([
        [-Infinity, 1.5],
        [2, 2.5],
      ]);
      expect(mergeMany([make(2, Infinity), make(0, 1.5)])).toEqual([
        [0, 1.5],
        [2, Infinity],
      ]);
    });

    it('should merge two ranges when one contains the other', () => {
      expect(mergeMany([make(0, 3), make(2, 2.5)])).toEqual([[0, 3]]);
      expect(mergeMany([make(2, 2.5), make(0, 3)])).toEqual([[0, 3]]);
      expect(mergeMany([make(0, Infinity), make(2, 2.5)])).toEqual([[0, Infinity]]);
      expect(mergeMany([make(2, 2.5), make(-Infinity, 3)])).toEqual([[-Infinity, 3]]);
    });
  });

  describe('handling three elements', () => {
    it('overlapping & containing', () => {
      expect(mergeMany([make(0, 3), make(1, 2), make(2, 2.5)])).toEqual([[0, 3]]);
      expect(mergeMany([make(2, 2.5), make(1, 2), make(0, 3)])).toEqual([[0, 3]]);

      expect(mergeMany([make(2, 2.5), make(1, 2), make(0, 3)])).toEqual([[0, 3]]);

      expect(mergeMany([make(1, 2), make(2, 2.5), make(0, 3)])).toEqual([[0, 3]]);
    });

    it('overlapping + non-overlapping', () => {
      expect(mergeMany([make(0, 1.5), make(1, 2), make(3, 3.5)])).toEqual([
        [0, 2],
        [3, 3.5],
      ]);

      expect(
        mergeMany([make(0, 1.5), make(1, 2), make(3, 3.5), make(-Infinity, Infinity)])
      ).toEqual([[-Infinity, Infinity]]);

      expect(mergeMany([make(1.6, 2), make(0, 1.5), make(3, 3.5)])).toEqual([
        [0, 1.5],
        [1.6, 2],
        [3, 3.5],
      ]);
    });
  });

  describe('handling 4+ elements', () => {
    it('overlapping & containing', () => {
      expect(mergeMany([make(0, 3), make(1.2, 1.34), make(1, 2), make(2, 2.5)])).toEqual([[0, 3]]);
      expect(mergeMany([make(2, 2.5), make(1.2, 1.34), make(1, 2), make(0, 3)])).toEqual([[0, 3]]);
      expect(mergeMany([make(2, 2.5), make(1.2, 1.34), make(1, 2), make(0, 3)])).toEqual([[0, 3]]);
      expect(mergeMany([make(1, 2), make(1.2, 1.34), make(2, 2.5), make(0, 3)])).toEqual([[0, 3]]);
    });

    it('overlapping + non-overlapping', () => {
      expect(mergeMany([make(1.6, 2), make(1.7, 1.84), make(1.71, 1.82)])).toEqual([[1.6, 2]]);

      expect(mergeMany([make(0, 1.5), make(1.2, 1.34), make(1, 2), make(3, 3.5)])).toEqual([
        [0, 2],
        [3, 3.5],
      ]);

      expect(
        mergeMany([
          make(0, 1.5),
          make(1.2, 1.34),
          make(1, 2),
          make(3, 3.5),
          make(-Infinity, Infinity),
        ])
      ).toEqual([[-Infinity, Infinity]]);

      expect(mergeMany([make(1.6, 2), make(1.7, 1.84), make(0, 1.5), make(3, 3.5)])).toEqual([
        [0, 1.5],
        [1.6, 2],
        [3, 3.5],
      ]);
    });
  });
});

describe('closest', () => {
  it('should work', () => {
    expect(closest(1, [make(1, 2), make(0, 2)])).toEqual({ in: true, range: make(1, 2) });
    expect(closest(1, [make(0, 2), make(1, 2)])).toEqual({ in: true, range: make(0, 2) });
    expect(closest(1, [make(0.5, 2), make(1, 2)])).toEqual({ in: true, range: make(0.5, 2) });
    expect(closest(0, [make(0.5, 2), make(1, 2)])).toEqual({ in: false, nextRange: make(0.5, 2) });
    expect(closest(3, [make(0.5, 2), make(1, 2)])).toEqual({ in: false, nextRange: undefined });
    expect(closest(3, [make(1, 2), make(0.5, 2)])).toEqual({ in: false, nextRange: undefined });
  });
});

describe('transform', () => {
  it('should work', () => {
    expect(transform([make(1, 2), make(0, 2)], (value) => value * 2)).toEqual([
      make(2, 4),
      make(0, 4),
    ]);
  });

  it('should use the index arg', () => {
    expect(transform([make(1, 2), make(0, 2)], (value, index) => value + index)).toEqual([
      make(1, 2),
      make(1, 3),
    ]);

    expect(transform([make(1, 2), make(0, 2)], (value, index) => value * index)).toEqual([
      make(0, 0),
      make(0, 2),
    ]);

    expect(transform([make(1, 2), make(0, 2)], (value, index) => value * (index + 1))).toEqual([
      make(1, 2),
      make(0, 4),
    ]);
  });

  it('should use the index and the edge args', () => {
    expect(
      transform(
        [make(1, 2), make(0, 2)],
        (value, index, edge) => value * (index + 1) * (edge === 'start' ? -1 : 1)
      )
    ).toEqual([make(-1, 2), make(-0, 4)]);

    expect(
      transform(
        [make(1, 2), make(3, 5)],
        (value, index, edge) => value * (index + 2) * (edge === 'start' ? -1 : 1)
      )
    ).toEqual([make(-2, 4), make(-9, 15)]);
  });
});
