import { AppBackground } from '../app-backgrounds';

export function drawBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  pattern: CanvasPattern | null,
  backgroundOptions: AppBackground
): void {
  /***
   * backgroundOptions fields
   *
   * color: Color to clear background first.
   * size: Only read when `image` is present; use `imageContainCoordinates` if its value is `contain`, otherwise use `imageCoverCoordinates`.
   * position: There's one background that uses it and it does not repeat (we could use the `imageCoverCoordinates` and shift it depending on the value).
   * repeat: We don't really read this, we draw one image or a repeating pattern depending on the  the presence of the `image` or `pattern` params.
   * attachment: Can't really use this, we don't really scroll elements.
   *
   ***/

  const canvasWidth = context.canvas.width;
  const canvasHeight = context.canvas.height;

  if (image) {
    const getImageCoords: (
      imageWidth: number,
      imageHeight: number,
      canvasWidth: number,
      canvasHeight: number,
      offsetLeft?: number,
      offsetTop?: number
    ) => DrawImageCoordinates =
      backgroundOptions.size === 'contain' ? imageContainCoordinates : imageCoverCoordinates;

    const coverCoords = getImageCoords(
      image.naturalWidth,
      image.naturalHeight,
      canvasWidth,
      canvasHeight
    );
    context.drawImage(
      image,
      coverCoords.offsetLeft,
      coverCoords.offsetTop,
      coverCoords.width,
      coverCoords.height
    );
  } else if (pattern) {
    context.save();
    context.fillStyle = pattern;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.restore();
  }
}

export interface DrawImageCoordinates {
  width: number;
  height: number;
  offsetLeft: number;
  offsetTop: number;
}

export function imageCoverCoordinates(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetLeft: number = 0.5,
  offsetTop: number = 0.5
): DrawImageCoordinates {
  const contentRatio = imageWidth / imageHeight;
  const containerRatio = canvasWidth / canvasHeight;

  const resultHeight = contentRatio > containerRatio ? canvasHeight : canvasWidth / contentRatio;
  const resultWidth = contentRatio > containerRatio ? canvasHeight * contentRatio : canvasWidth;

  return {
    width: resultWidth,
    height: resultHeight,
    offsetLeft: (canvasWidth - resultWidth) * offsetLeft,
    offsetTop: (canvasHeight - resultHeight) * offsetTop,
  };
}

export function imageContainCoordinates(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  offsetLeft: number = 0.5,
  offsetTop: number = 0.5
): DrawImageCoordinates {
  return imageCoverCoordinates(
    imageWidth,
    imageHeight,
    canvasWidth,
    canvasHeight,
    offsetLeft,
    offsetTop
  );
}
