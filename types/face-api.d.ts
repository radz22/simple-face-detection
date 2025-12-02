declare module 'face-api.js' {
  export interface WithFaceDetection<TSource> {
    detection: FaceDetection;
  }

  export interface WithFaceLandmarks<TSource extends WithFaceDetection<{}>> {
    landmarks: FaceLandmarks68;
  }

  export interface WithFaceDescriptor<TSource> {
    descriptor: Float32Array;
  }

  export interface FaceDetection {
    score: number;
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  export interface FaceLandmarks68 {
    positions: Array<{ x: number; y: number }>;
  }

  export class TinyFaceDetectorOptions {
    inputSize?: number;
    scoreThreshold?: number;
  }

  export interface FaceDetectionWithLandmarks
    extends WithFaceLandmarks<WithFaceDetection<{}>> {}

  export interface FaceDetectionWithDescriptor
    extends WithFaceDescriptor<FaceDetectionWithLandmarks> {}

  export const nets: {
    tinyFaceDetector: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri(uri: string): Promise<void>;
    };
    faceRecognitionNet: {
      loadFromUri(uri: string): Promise<void>;
    };
  };

  export function detectSingleFace(
    input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    options?: TinyFaceDetectorOptions
  ): {
    withFaceLandmarks(): {
      withFaceDescriptor(): Promise<FaceDetectionWithDescriptor | null>;
    };
  };

  export function euclideanDistance(a: Float32Array, b: Float32Array): number;
}
