import React, { Fragment, useState, useCallback } from 'react';

import './App.css';
import Recorder from './Recorder';
import DownloadsListManager, { DownloadUrl } from './DownloadsList';

export default function App() {
  const [downloads, setDownloads] = useState<DownloadUrl[]>([]);

  const addNewDownloadUrl = useCallback(function addNewDownloadUrlCb(
    downloadUrl: DownloadUrl
  ): void {
    setDownloads((downloads) => [downloadUrl, ...downloads]);
  },
  []);

  const playVideo = useCallback(function playVideoCb(item: DownloadUrl): void {
    console.log('Playing', item);
  }, []);

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

  return (
    <Fragment>
      <header className="main-header">
        <h1>Weft</h1>
      </header>
      <Recorder onNewDownloadUrl={addNewDownloadUrl} />
      <DownloadsListManager items={downloads} onEditItems={setDownloadList} onPlayItem={playVideo} />
    </Fragment>
  );
}
