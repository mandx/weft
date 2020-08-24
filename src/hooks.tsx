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
