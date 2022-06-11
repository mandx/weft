import { MouseEvent, ReactNode, Children, useEffect, useState, useCallback } from 'react';

import { classnames } from './utilities';
import { useEscKey } from './hooks';
import SectionPage from './SectionPage';
import { AppBackground, backgroundAsStyles } from './app-backgrounds';
import './Settings.scss';

interface SettingsProps {
  className?: string;
  children?: ReactNode;
  onCancel?: (event: Event) => void;
  onSelectedAppBackground?: (bg: AppBackground) => void;
  onSelectedRecordingBackground?: (bg: AppBackground) => void;
}

export default function Settings({
  className,
  children,
  onCancel,
  onSelectedAppBackground,
  onSelectedRecordingBackground,
}: SettingsProps) {
  useEscKey(onCancel);
  const [backgrounds, setBackgrounds] = useState<AppBackground[]>([]);

  useEffect(() => {
    import('./svgBgs.json').then((mod) => {
      setBackgrounds(mod.default);
    });
  }, []);

  const chooseBackground = useCallback(
    function clickHandler(event: MouseEvent<HTMLButtonElement>) {
      const bgType = (event.target as HTMLButtonElement).dataset.backgroundType;
      const bgName = (event.target as HTMLButtonElement).dataset.backgroundName;
      const chosen = backgrounds.find((bg) => bg.$name === bgName);
      if (chosen) {
        switch (bgType) {
          case 'app': {
            onSelectedAppBackground?.(chosen);
            break;
          }
          case 'recording': {
            onSelectedRecordingBackground?.(chosen);
            break;
          }
        }
      }
    },
    [backgrounds, onSelectedAppBackground, onSelectedRecordingBackground]
  );

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
                <button
                  type="button"
                  data-background-name={background.$name}
                  data-background-type="recording"
                  onClick={chooseBackground}
                >
                  Set as Recording Background
                </button>
                <button
                  type="button"
                  data-background-name={background.$name}
                  data-background-type="app"
                  onClick={chooseBackground}
                >
                  Set as App Background
                </button>
              </li>
            ))}
          </ul>
        </details>

        {!!Children.count(children) && <div className="settings-page-content">{children}</div>}
      </div>
    </SectionPage>
  );
}
