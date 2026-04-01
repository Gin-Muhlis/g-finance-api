import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../common/config.ts';
import { ValidationError } from '../common/errors.ts';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

export interface UploadResult {
  filePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export async function saveFile(file: File): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new ValidationError(
      `File type '${file.type}' not allowed. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}`,
    );
  }

  if (file.size > config.upload.maxFileSize) {
    throw new ValidationError(
      `File size exceeds maximum of ${config.upload.maxFileSize / 1024 / 1024}MB`,
    );
  }

  const ext = file.name.split('.').pop() || 'bin';
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const dir = join(config.upload.dir, 'attachments');

  await mkdir(dir, { recursive: true });

  const filePath = join(dir, uniqueName);
  await Bun.write(filePath, file);

  return {
    filePath,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
  };
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    const file = Bun.file(filePath);
    if (await file.exists()) {
      await import('node:fs/promises').then((fs) => fs.unlink(filePath));
    }
  } catch {
    // File may already be deleted, ignore
  }
}
