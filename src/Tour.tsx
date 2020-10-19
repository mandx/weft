import React, { Fragment, Suspense } from 'react';

const Joyride = React.lazy(() => import('react-joyride'));
export type { CallBackProps as TourCallBackProps } from 'react-joyride';

export default function Tour(props: React.ComponentProps<typeof Joyride>) {
  return (
    <Suspense fallback={<Fragment />}>
      <Joyride {...props} />
    </Suspense>
  );
}
