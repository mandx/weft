import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import './Modal.scss';

type CloseIntent = 'EscapeKey' | 'BackdropClick';

interface ModalProps {
  className?: string;
  /**
   * Content to render inside the Modal
   */
  children?: ReactNode;
  /**
   * DOM element to use as the Portal root
   */
  container: Element;
  /**
   * Setting this to false makes the component render `null`
   */
  open?: boolean;
  /**
   * Callback triggered with a close intent from the user
   *
   * @param intent - The intent used
   */
  onClose?: (intent: CloseIntent) => void;
}

export default function Modal({ className, children, container, open, onClose }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const clickClose = useCallback(
    function <T>(_event: React.MouseEvent<T>) {
      onClose?.('BackdropClick');
    },
    [onClose]
  );

  const keyboardClose = useCallback(
    function <T>(event: React.KeyboardEvent<T>) {
      console.log(event.target);
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.('EscapeKey');
      }
    },
    [onClose]
  );

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  if (!open) {
    return null;
  }

  return createPortal(
    // TODO: Implement focus trapping (`$ yarn add focus-trap-react`)
    <div
      className="modal-dialog-container"
      role="presentation"
      ref={containerRef}
      onKeyDown={keyboardClose}
      tabIndex={-1}>
      <div className="modal-dialog-backdrop" aria-hidden onClick={clickClose}></div>
      <div className={`modal-dialog-content ${className || ''}`}>{children}</div>
    </div>,
    container
  );
}

Modal.defaultProps = {
  container: document.body,
} as ModalProps;
