import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = import.meta.env.VITE_S3_BUCKET_NAME;
const REGION = import.meta.env.VITE_S3_BUCKET_REGION;

// This will handle fetching files from S3