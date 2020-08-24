import React, { Fragment } from 'react';

export default function PermissionAlert({
  permission,
  children,
}: {
  permission: boolean | null;
  children: React.ReactNode;
}) {
  let content = (
    <Fragment>
      {children}
      <span>Waiting</span>
    </Fragment>
  );

  switch (permission) {
    case true:
      content = (
        <Fragment>
          {children}
          <span>Granted</span>
        </Fragment>
      );
      break;
    case false:
      content = (
        <Fragment>
          {children}
          <span>Denied</span>
        </Fragment>
      );
      break;
  }

  return <span className="permission-alert">{content}</span>;
}
