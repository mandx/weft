import React, { useRef, MutableRefObject } from 'react';

type AllPossibleRefTypes<T> = ((instance: T | null) => void) | MutableRefObject<T | null>;

export function useCombinedRefs<T>(
  ...refs: (AllPossibleRefTypes<T> | null)[]
): MutableRefObject<T | null> {
  const targetRef = useRef<T>(null);

  React.useEffect(() => {
    refs.forEach((ref) => {
      if (!ref) {
        return;
      }

      if (typeof ref === 'function') {
        ref(targetRef.current);
      } else {
        ref.current = targetRef.current;
      }
    });
  }, [refs]);

  return targetRef;
}

/**
 * React hook for creating a value exactly once. `useMemo` doesn't give this
 * guarantee unfortunately. Takes a function that will be called once on the
 * first render, the return value will be cached and returned in subsequent
 * renders.
 *
 * https://reactjs.org/docs/hooks-faq.html#how-to-create-expensive-objects-lazily
 *
 * Taken from https://github.com/Andarist/use-constant
 */
export function useConstant<T>(fn: () => T): T {
  const ref = React.useRef<T>();

  if (ref.current === undefined) {
    ref.current = fn();
  }

  return ref.current;
}
