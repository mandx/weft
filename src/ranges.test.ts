import { addRange } from './ranges';

describe('Ranges', function describe_Ranges() {
  describe('addRange', function describe_addRange() {
    it('should merge overlapping ranges', function it_should_add_range() {
      expect(
        addRange(
          [
            [1, 2],
            [3, 4],
          ],
          [0, 2]
        )
      ).toStrictEqual([
        [0, 2],
        [3, 4],
      ]);
      expect(
        addRange(
          [
            [1, 2],
            [3, 4],
          ],
          [0, 1.5]
        )
      ).toStrictEqual([
        [0, 2],
        [3, 4],
      ]);
    });

    it('should merge adjacent ranges', function it_should_add_range() {
      expect(
        addRange(
          [
            [1, 2],
            [3, 4],
          ],
          [0, 1]
        )
      ).toStrictEqual([
        [0, 2],
        [3, 4],
      ]);
    });

    it('should add range without overlap', function it_should_add_range() {
      expect(
        addRange(
          [
            [1, 2],
            [3, 4],
          ],
          [0, 0.5]
        )
      ).toStrictEqual([
        [0, 0.5],
        [1, 2],
        [3, 4],
      ]);
    });

    it('should merge a range overlapping two other ranges', function it_should_add_range() {
      expect(
        addRange(
          [
            [1, 2],
            [3, 4],
          ],
          [1.25, 3.25]
        )
      ).toStrictEqual([[1, 4]]);
      expect(
        addRange(
          [
            [0, 0.25],
            [1, 2],
            [3, 4],
          ],
          [1.25, 3.25]
        )
      ).toStrictEqual([
        [0, 0.25],
        [1, 4],
      ]);
    });
  });
});
