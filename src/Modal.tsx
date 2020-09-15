import React, { ReactNode, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import './Modal.scss';

interface ModalProps {
  children?: ReactNode;
  container: Element;
  open?: boolean;
  onClose?: () => void;
}

export default function Modal({ children, container, open, onClose }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const clickClose = useCallback(
    function <T>(_event: React.MouseEvent<T>) {
      onClose?.();
    },
    [onClose]
  );

  const keyboardClose = useCallback(
    function <T>(event: React.KeyboardEvent<T>) {
      console.log(event.target);
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
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
      <div className="modal-dialog-content">{children}</div>
    </div>,
    container
  );
}

Modal.defaultProps = {
  container: document.body,
} as ModalProps;
