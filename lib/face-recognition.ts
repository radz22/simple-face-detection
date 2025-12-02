import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

let modelsLoaded = false;

export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  } catch (error) {
    console.error('Error loading face-api.js models:', error);
    throw new Error('Failed to load face recognition models');
  }
}

export async function detectFace(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<faceapi.FaceDetectionWithDescriptor | null> {
  await loadModels();

  // Chain withFaceLandmarks() and withFaceDescriptor() before awaiting
  const detection = await faceapi
    .detectSingleFace(image, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
}

export async function getFaceEmbedding(
  image: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<Float32Array | null> {
  const detection = await detectFace(image);

  if (!detection) {
    return null;
  }

  return detection.descriptor;
}

export function compareEmbeddings(
  embedding1: Float32Array,
  embedding2: Float32Array
): number {
  return faceapi.euclideanDistance(embedding1, embedding2);
}

export function cosineSimilarity(
  embedding1: Float32Array,
  embedding2: Float32Array
): number {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

export interface FaceMatch {
  userId: string;
  distance: number;
  similarity: number;
}

export function findBestMatch(
  userEmbedding: Float32Array,
  storedEmbeddings: Array<{ userId: string; embeddings: number[] }>
): FaceMatch | null {
  const MIN_SIMILARITY_THRESHOLD = 0.6; // Adjust based on testing

  let bestMatch: FaceMatch | null = null;
  let bestSimilarity = 0;

  for (const stored of storedEmbeddings) {
    const storedArray = new Float32Array(stored.embeddings);
    const similarity = cosineSimilarity(userEmbedding, storedArray);
    const distance = compareEmbeddings(userEmbedding, storedArray);

    if (similarity > bestSimilarity && similarity >= MIN_SIMILARITY_THRESHOLD) {
      bestSimilarity = similarity;
      bestMatch = {
        userId: stored.userId,
        distance,
        similarity,
      };
    }
  }

  return bestMatch;
}

export function arrayToFloat32Array(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

export function float32ArrayToArray(arr: Float32Array): number[] {
  return Array.from(arr);
}
export function faceMatch(
  embedding: Float32Array,
  storedEmbeddings: Array<{ userId: string; embeddings: number[] }>
): FaceMatch | null {
  const bestMatch = findBestMatch(embedding, storedEmbeddings);
  return bestMatch;
}
