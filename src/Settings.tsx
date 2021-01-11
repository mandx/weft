import { ReactNode, Children, useEffect, useState } from 'react';

import { classnames } from './utilities';
import { useEscKey } from './hooks';
import SectionPage from './SectionPage';
import { AppBackground, backgroundAsStyles } from './app-backgrounds';
import './Settings.scss';

interface SettingsProps {
  className?: string;
  children?: ReactNode;
  onCancel?: (event: Event) => void;
}

export default function Settings({ className, children, onCancel }: SettingsProps) {
  useEscKey(onCancel);
  const [backgrounds, setBackgrounds] = useState<AppBackground[]>([]);

  useEffect(() => {
    import('./svgBgs.json').then((mod) => {
      setBackgrounds(mod.default);
    });
  });

  return (
    <SectionPage className={classnames('settings-page', className)}>
      <h1>Settings</h1>
      <div className="scroll-container">
        <details open>
          <summary>Background</summary>
          <ul className="backgrounds-list">
            {backgrounds.map((background) => (
              <li key={background.$name} style={backgroundAsStyles(background)} tabIndex={0}>
                <span className="background-name">{background.$name}</span>
                <button type="button">Set as Recording Background</button>
                <button type="button">Set as App Background</button>
              </li>
            ))}
          </ul>
        </details>

        {!!Children.count(children) && <div className="settings-page-content">{children}</div>}
      </div>
    </SectionPage>
  );
}
