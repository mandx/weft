import { ReactNode, Children } from 'react';

import { classnames } from './utilities';
import { useEscKey } from './hooks';
import SectionPage from './SectionPage';
import './AboutPage.scss';

interface AboutPageProps {
  className?: string;
  children?: ReactNode;
  onCancel?: (event: Event) => void;
}

export default function AboutPage({ className, children, onCancel }: AboutPageProps) {
  useEscKey(onCancel);

  return (
    <SectionPage className={classnames('about-page', className)}>
      <h1>Weft!</h1>
      <h2>An experimental, offline-first* self recording web app</h2>

      <p>
        Awesome backgrounds from <a href="https://www.svgbackgrounds.com/">SVGBackgrounds.com</a>
      </p>
      <p>
        Icons from <a href="https://icons.getbootstrap.com/">Bootstrap Icons</a>
      </p>

      <p>
        <strong>*</strong> At the moment, this app is offline <em>*only*</em>; all the data is saved
        to your{' '}
        <a title="IndexedDB" href="https://developer.mozilla.org/en-US/docs/Glossary/IndexedDB">
          browser's own storage spage
        </a>
        .
      </p>

      {!!Children.count(children) && <div className="about-page-content">{children}</div>}
    </SectionPage>
  );
}
