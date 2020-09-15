/** NODE_ENV === 'production' */
export const PRODUCTION: boolean = process.env.NODE_ENV === 'production';

/** NODE_ENV === 'development' */
export const DEVELOPMENT: boolean = process.env.NODE_ENV === 'development';

const SKIP_LOOP = process.env.REACT_APP_SKIP_RECORDER_RENDER_LOOP || 'false';

/** `true` if we should skip starting the recorder render loop */
export const SKIP_RECORDER_RENDER_LOOP: boolean =
  !PRODUCTION &&
  ['0', '1', 'true', 'false'].includes(SKIP_LOOP) &&
  (function () {
    try {
      return !!JSON.parse(SKIP_LOOP);
    } catch (_e) {
      return false;
    }
  })();
