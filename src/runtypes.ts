import * as st from 'simple-runtypes';
import { AppBackground as AppBackgroundType } from './app-backgrounds';
import { MediaAccess } from './RecordOptions';

export * from 'simple-runtypes';

const cssString = st.string({ minLength: 5, trim: true });
export const SloppyAppBackground = st.sloppyRecord({
  $name: cssString,
  image: st.string({ match: /^url\("data:image\//i }),
  attachment: st.optional(cssString),
  color: st.optional(cssString),
  position: st.optional(cssString),
  repeat: st.optional(cssString),
  size: st.optional(cssString),
});

export const AppBackground = st.runtype((v): AppBackgroundType | st.Fail => {
  const validation = st.use(SloppyAppBackground, v);
  if (validation.ok) {
    return validation.result;
  }
  return validation.error;
});

export const MediaPreference = st.union(st.literal('ACTIVE'), st.literal('INACTIVE'));

export function mediaAccessToMediaPreference(
  access: MediaAccess
): ReturnType<typeof MediaPreference> {
  return access === 'ACTIVE' ? access : 'INACTIVE';
}

export const MediaPreferences = st.sloppyRecord({
  screen: MediaPreference,
  camera: MediaPreference,
  microphone: MediaPreference,
});

export type MediaAccesses = {
  screen: MediaAccess;
  camera: MediaAccess;
  microphone: MediaAccess;
};

export function mediaPreferencesToMediaAccesses(
  preferences: Readonly<ReturnType<typeof MediaPreferences>>
): MediaAccesses {
  return {
    screen: preferences.screen,
    camera: preferences.camera,
    microphone: preferences.microphone,
  };
}

export function mediaAccessesToMediaPreferences({
  screen,
  camera,
  microphone,
}: Readonly<MediaAccesses>): ReturnType<typeof MediaPreferences> {
  return {
    screen: mediaAccessToMediaPreference(screen),
    camera: mediaAccessToMediaPreference(camera),
    microphone: mediaAccessToMediaPreference(microphone),
  };
}
