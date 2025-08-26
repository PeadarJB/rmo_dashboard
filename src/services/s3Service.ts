// src/services/s3Service.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAWSCredentials } from './credentialsService';
import { logger } from '@/utils/logger';

const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME;
const REGION = import.meta.env.VITE_S3_BUCKET_REGION;
const DATA_PREFIX = import.meta.env.VITE_S3_DATA_PREFIX || 'data/';

// Cache for S3 client (recreated when credentials change)
let s3Client: S3Client | null = null;

/**
 * Get or create an S3 client with current credentials
 */
async function getS3Client(): Promise<S3Client> {
  const credentials = await getAWSCredentials();
  
  // Create new client with fresh credentials
  s3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    }
  });
  
  return s3Client;
}

/**
 * Fetch a JSON file from S3
 * @param fileName - Name of the file (without path prefix)
 * @param onProgress - Optional callback for download progress
 */
export async function fetchFromS3<T = any>(
  fileName: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<T> {
  try {
    logger.info('s3Service', `Fetching ${fileName} from S3...`);
    
    const client = await getS3Client();
    const key = `${DATA_PREFIX}${fileName}`;
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    const startTime = Date.now();
    const response = await client.send(command);
    
    if (!response.Body) {
      throw new Error(`No data received for ${fileName}`);
    }
    
    // Get content length for progress tracking
    const contentLength = response.ContentLength || 0;
    
    // Convert stream to string with progress tracking
    const stream = response.Body;
    const chunks: Uint8Array[] = [];
    let loadedBytes = 0;
    
    // @ts-ignore - Body.transformToWebStream() exists in browser
    if (stream.transformToWebStream) {
      // @ts-ignore
      const webStream = stream.transformToWebStream();
      const reader = webStream.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loadedBytes += value.length;
        
        if (onProgress && contentLength > 0) {
          onProgress(loadedBytes, contentLength);
        }
      }
    } else {
      // Fallback for environments without transformToWebStream
      const bodyString = await response.Body.transformToString();
      const encoder = new TextEncoder();
      chunks.push(encoder.encode(bodyString));
    }
    
    // Combine chunks and decode
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(combined);
    const data = JSON.parse(jsonString);
    
    const duration = Date.now() - startTime;
    logger.info('s3Service', `Successfully fetched ${fileName}`, {
      size: `${(loadedBytes / 1024 / 1024).toFixed(2)} MB`,
      duration: `${duration}ms`
    });
    
    return data;
    
  } catch (error) {
    logger.error('s3Service', `Failed to fetch ${fileName} from S3`, { error });
    throw error;
  }
}

/**
 * Check if a file exists in S3 (used for validation)
 */
export async function checkFileExists(fileName: string): Promise<boolean> {
  try {
    const client = await getS3Client();
    const key = `${DATA_PREFIX}${fileName}`;
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    
    // Use head request to check existence without downloading
    await client.send(command);
    return true;
    
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Fetch multiple files in parallel
 */
export async function fetchMultipleFromS3<T = any>(
  fileNames: string[]
): Promise<Record<string, T>> {
  const results: Record<string, T> = {};
  
  await Promise.all(
    fileNames.map(async (fileName) => {
      try {
        results[fileName] = await fetchFromS3<T>(fileName);
      } catch (error) {
        logger.error('s3Service', `Failed to fetch ${fileName}`, { error });
        throw error;
      }
    })
  );
  
  return results;
}

/**
 * Clear the S3 client (useful on logout)
 */
export function clearS3Client() {
  s3Client = null;
  logger.info('s3Service', 'S3 client cleared');
}