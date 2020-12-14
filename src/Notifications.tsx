import { MutableRefObject, ReactNode, useState, useRef, useEffect, useCallback } from 'react';

import './Notifications.scss';

export type NotificationLevel = 'info' | 'success' | 'warn' | 'warning' | 'danger' | 'error';

export type NotificationHandler = (content: ReactNode, level: NotificationLevel) => void;

export interface NotificationsEmitter {
  on(handler: NotificationHandler): void;
  off(handler: NotificationHandler): void;
  emit(content: ReactNode, level: NotificationLevel): void;
}

export function createNotificationsEmitter(): NotificationsEmitter {
  const contents: [ReactNode, NotificationLevel][] = [];
  const handlers: NotificationHandler[] = [];

  function drain() {
    const content: [ReactNode, NotificationLevel] | undefined = contents.shift();

    if (content) {
      for (const handler of handlers) {
        setTimeout(handler, undefined, ...content);
      }

      if (contents.length) {
        setTimeout(drain);
      }
    }
  }

  return {
    emit(content: ReactNode, level: NotificationLevel = 'info') {
      contents.push([content, level]);
      drain();
    },

    on(handler: NotificationHandler) {
      handlers.push(handler);
    },

    off(handler: NotificationHandler) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        contents.splice(index);
      }
    },
  };
}

interface NotificationsProps {
  readonly emitter: NotificationsEmitter;
}

export default function Notifications({ emitter }: NotificationsProps) {
  const intervalIdRef: MutableRefObject<ReturnType<typeof setInterval> | undefined> = useRef(
    undefined
  );
  const [contents, setContents] = useState<readonly [ReactNode, NotificationLevel, number][]>([]);

  const intervalHandler = useCallback(() => {
    setContents((contents) => {
      if (contents.length === 1) {
        if (intervalIdRef.current) {
          clearInterval(intervalIdRef.current);
          intervalIdRef.current = undefined;
        }
      }

      return contents.slice(1);
    });
  }, []);

  useEffect(() => {
    function handler(content: ReactNode, level: NotificationLevel): void {
      setContents((contents) => {
        if (!intervalIdRef.current) {
          intervalIdRef.current = setInterval(intervalHandler, 5000);
        }

        return [...contents, [content, level, new Date().getTime()]];
      });
    }

    emitter.on(handler);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = undefined;
      }
      emitter.off(handler);
    };
  }, [emitter, intervalHandler]);

  return contents.length ? (
    <ul className="notifications-container">
      {contents.map(([content, level, key]) => (
        <li key={key} className={`notification notification-${level}`}>
          {content}
        </li>
      ))}
    </ul>
  ) : null;
}
