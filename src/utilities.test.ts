import { classnames } from './utilities';

describe('bind', function () {
  describe('classNames', function () {
    it('keeps object keys with truthy values', function () {
      expect(
        classnames({
          a: true,
          b: false,
          c: 0,
          d: null,
          e: undefined,
          f: 1,
        })
      ).toBe('a f');
    });

    it('joins arrays of class names and ignore falsy values', function () {
      expect(classnames('a', 0, null, undefined, true, 1, 'b')).toBe('a 1 b');
    });

    it('supports heterogenous arguments', function () {
      expect(classnames({ a: true }, 'b', 0)).toBe('a b');
    });

    it('should be trimmed', function () {
      expect(classnames('', 'b', {}, '')).toBe('b');
    });

    it('returns an empty string for an empty configuration', function () {
      expect(classnames({})).toBe('');
    });

    it('supports an array of class names', function () {
      expect(classnames(['a', 'b'])).toBe('a b');
    });

    it('joins array arguments with string arguments', function () {
      expect(classnames(['a', 'b'], 'c')).toBe('a b c');
      expect(classnames('c', ['a', 'b'])).toBe('c a b');
    });

    it('handles multiple array arguments', function () {
      expect(classnames(['a', 'b'], ['c', 'd'])).toBe('a b c d');
    });

    it('handles arrays that include falsy and true values', function () {
      expect(classnames(['a', 0, null, undefined, false, true, 'b'])).toBe('a b');
    });

    it('handles arrays that include arrays', function () {
      expect(classnames(['a', ['b', 'c']])).toBe('a b c');
    });

    it('handles arrays that include objects', function () {
      expect(classnames(['a', { b: true, c: false }])).toBe('a b');
    });

    it('handles deep array recursion', function () {
      expect(classnames(['a', ['b', ['c', { d: true }]]])).toBe('a b c d');
    });

    it('handles own toString() method defined on object', function () {
      expect(
        classnames({
          toString: function () {
            return 'classFromMethod';
          },
        })
      ).toBe('classFromMethod');
    });

    it('handles toString() method defined inherited in object', function () {
      function Class1() {}
      function Class2() {}

      Class1.prototype.toString = function () {
        return 'classFromMethod';
      };

      Class2.prototype = Object.create(Class1.prototype);

      expect(classnames(new Class2())).toBe('classFromMethod');
    });
  });
});
