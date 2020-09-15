import React, { Fragment, useEffect, useRef, useState, useCallback } from 'react';

import './App.scss';
import Recorder from './Recorder';
import DownloadsListManager, { DownloadUrl } from './DownloadsList';
import Notifications, { NotificationsEmitter, createNotificationsEmitter } from './Notifications';
import Modal from './Modal';

export default function App() {
  const notificationsEmitterRef = useRef<NotificationsEmitter>(createNotificationsEmitter());

  const [downloads, setDownloads] = useState<DownloadUrl[]>([]);
  const [playingUrl, setPlayingUrl] = useState<DownloadUrl | null>(null);

  const addNewDownloadUrl = useCallback(function addNewDownloadUrlCb(
    downloadUrl: DownloadUrl
  ): void {
    setDownloads((downloads) => [downloadUrl, ...downloads]);
  },
  []);

  const setDownloadList = useCallback(function setDownloadListCb(newList: DownloadUrl[]): void {
    setDownloads((oldList) => {
      // We need to revoke in-memory blob URLs that might have been deleted
      const pickUrl = (item: DownloadUrl) => item.url;

      const oldUrls = new Set(oldList.map(pickUrl));
      Array.from(new Set(newList.map(pickUrl).filter((url) => !oldUrls.has(url)))).forEach(
        URL.revokeObjectURL
      );

      return newList;
    });
  }, []);

  const playVideo = useCallback(function playVideoCb<T>(
    item: DownloadUrl,
    event: React.MouseEvent<T>
  ): void {
    if (event.ctrlKey) {
      window.open(item.url, '_blank');
    } else {
      setPlayingUrl(item);
    }
  },
  []);

  const closeVideoPlayer = useCallback(function closeVideoPlayerCb() {
    setPlayingUrl(null);
  }, []);

  return (
    <Fragment>
      <nav className="main-nav">
        <header className="main-header">
          <h1>Weft</h1>
        </header>
        <DownloadsListManager
          items={downloads}
          onEditItems={setDownloadList}
          onPlayItem={playVideo}
        />
      </nav>
      <Recorder
        onNewDownloadUrl={addNewDownloadUrl}
        emitNotification={notificationsEmitterRef.current.emit}
      />
      {!!playingUrl && (
        <Modal open onClose={closeVideoPlayer}>
          <button type="button" onClick={closeVideoPlayer}>
            Close player
          </button>
          <video src={playingUrl ? playingUrl.url : undefined} controls />
        </Modal>
      )}
      <Notifications emitter={notificationsEmitterRef.current} />
    </Fragment>
  );
}
