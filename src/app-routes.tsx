import { path } from 'static-path';

export const index = path('/');
export const record = path('/record');
export const recordingPlay = path('/play/:recordingId');
export const recordingEdit = path('/play/:recordingId/edit');
export const settings = path('/settings');
export const about = path('/about');
