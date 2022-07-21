import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { Range } from './ranges';
import { nanoid } from 'nanoid';

export default class FfmpegWrapper extends EventTarget {
  private loaded: Promise<ReturnType<typeof createFFmpeg>>;

  constructor({
    corePath = process.env.PUBLIC_URL + '/ffmpeg-core.js',
  }: { corePath?: string } = {}) {
    super();
    this.loaded = new Promise((resolve, reject) => {
      const ffmpeg = createFFmpeg({
        corePath,
        log: true,
        logger: ({ type: level, message }) => {
          this.dispatchEvent(
            Object.assign(new Event('output'), {
              level,
              message,
            })
          );
        },
        progress: ({ ratio }) => {
          this.dispatchEvent(
            Object.assign(new Event('progress'), {
              ratio,
              progress: ratio * 100,
            })
          );
        },
      });
      ffmpeg.load().then(
        () => {
          this.dispatchEvent(new Event('loaded'));
          resolve(ffmpeg);
        },
        (reason) => {
          this.dispatchEvent(new Event('loaded-error'));
          reject(reason);
        }
      );
    });
  }

  /*
  generateBetweenFilter(ranges: readonly Range[]): string {
    return ranges.map(([start, end]) => `between(t,${start},${end})`).join('+');
  }

  async slice(input: Blob, ranges: readonly Range[]): Promise<Blob> {
    const inputFilename = `input-${nanoid(32)}.webm`;
    const outputFilename = `output-${nanoid(32)}.webm`;
    const ffmpeg = await this.loaded;

    ffmpeg.FS('writeFile', inputFilename, await fetchFile(input));

    const between = this.generateBetweenFilter(ranges);
    const videoFilter = `select='${between}',setpts=N/FRAME_RATE/TB`;
    const audioFilter = `aselect='${between}',asetpts=N/SR/TB`;

    await ffmpeg.run('-i', inputFilename, '-vf', videoFilter, '-af', audioFilter, outputFilename);
    ffmpeg.FS('unlink', inputFilename);
    const result = ffmpeg.FS('readFile', outputFilename);
    ffmpeg.FS('unlink', outputFilename);
    return new Blob([result.buffer], { type: 'video/mp4' });
  }
  */

  /**
   * Takes a video `Blob` (`input`) and an *ordered* of `Range`s (`ranges`) and
   * returns a new `Blob` that is the result of slicing `input` using `ranges`
   * and then concatenating them together. Both slicing and concatenating is
   * done with `FFMPEG.WASM`.
   *
   * The ordering of `ranges` is important: If `input` is 15 secs long, and
   * `ranges` contains two ranges, the first one for the last 5 secs and the
   * second one for the first 5 secs, then the result will contain the last 5
   * secs of `input` immediately followed by the first 5 secs of `input`. So
   * it's the responsibility of the caller to ensure the ordering is the
   * intended one.
   *
   * Implementation notes:
   * FFMPEG does have powerful filtering options, something like:
   * ```
   * $ ffmpeg -i video -vf "select='between(t,4,6.5)'" output.mp4
   * ```
   * (where `4` and `6.5` are total seconds with milliseconds as the fractional part)
   *
   * However I have found a few problems with filtering:
   * - This forces the video and audio streams to be decoded and re-encoded.
   *   Which, on top of the obvious quality loss, forces us to select codecs
   *   and encoding options, while most of the time we pretty much want what's
   *   already in the source stream.
   * - I couldn't get this to work properly with video encoded in the browser,
   *   I don't know if it's because of variable bitrate, or variable framerate.
   *
   * Currently, we are generating video slices (actual video files) and then
   * creating a concatenation playlist (https://trac.ffmpeg.org/wiki/Concatenate#demuxer)
   *
   * Specifically, we take each range, and use the `start`` and `end`` values
   * and pass that to FFMPEG using the `-ss` and `-to` CLI args, generating a
   * video slice for this range. Then the filename for this slice is added to
   * the concat list, and when all slices are created, then we concatenate them
   * using FFMPEG's special `-f concat` filter.
   *
   * This is quite a lot of work and housekeeping (we need to remove those
   * "files" later) this can actually be faster than using filters, because
   * this method allows us to use the `-c copy` flag on every step, which means
   * it will copy the audio/video stream data instead of having to re-encode them.
   */
  async slice(input: Blob, ranges: readonly Range[]): Promise<Blob> {
    const inputFilename = `input-${nanoid(32)}.webm`;
    const outputFilename = `output-${nanoid(32)}.webm`;
    const concatListFilename = `concatList-${nanoid(32)}.txt`;
    const sliceFilenames: string[] = [];
    const ffmpeg = await this.loaded;

    ffmpeg.FS('writeFile', inputFilename, await fetchFile(input));

    for (const { startTimecode, endTimecode, index } of ranges.map(([start, end], index) => ({
      startTimecode: secondsToDurationStr(start),
      endTimecode: secondsToDurationStr(end),
      index,
    }))) {
      const outputSliceFilename = `slice-${index}-${nanoid(32)}.webm`;
      await ffmpeg.run(
        '-ss',
        startTimecode,
        '-to',
        endTimecode,
        '-i',
        inputFilename,
        '-c',
        'copy',
        outputSliceFilename
      );
      sliceFilenames.push(outputSliceFilename);
    }

    const concatListContent = new Blob([sliceFilenames.map((f) => `file '${f}'`).join('\n')]);
    ffmpeg.FS(
      'writeFile',
      concatListFilename,
      new Uint8Array(await concatListContent.arrayBuffer())
    );

    await ffmpeg.run('-f', 'concat', '-i', concatListFilename, '-c', 'copy', outputFilename);

    const result = ffmpeg.FS('readFile', outputFilename);

    for (const filename of [
      inputFilename,
      ...sliceFilenames,
      concatListFilename,
      outputFilename,
    ].filter((f) => !!f)) {
      ffmpeg.FS('unlink', filename);
    }
    return new Blob([result.buffer]);
  }
}

export function secondsToDurationStr(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  const remainderMinutes = totalSeconds % 3600;
  const minutes = remainderMinutes / 60;
  const seconds = remainderMinutes % 60;
  return `${hours.toFixed(0)}:${minutes.toFixed(0)}:${seconds}`;
}
