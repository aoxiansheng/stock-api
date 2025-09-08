export interface SizeFields {
  originalSize?: number;
  compressedSize?: number;
  serializedSize?: number;
}

export interface CacheConfigSizeInfo {
  maxSize?: number;
}

export interface CompressionSizeInfo {
  originalSize: number;
  processedSize?: number;
}

export interface BatchSizeInfo {
  batchSize: number;
}