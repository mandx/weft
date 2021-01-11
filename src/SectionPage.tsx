import { ReactNode } from 'react';

import { classnames } from './utilities';

import './SectionPage.scss';

export interface SectionPageProps {
  className?: string;
  children?: ReactNode;
}

export default function SectionPage(props: SectionPageProps) {
  return (
    <section className={classnames('section-page', props.className)}>{props.children}</section>
  );
}
