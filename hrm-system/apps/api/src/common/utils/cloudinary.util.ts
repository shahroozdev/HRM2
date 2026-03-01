import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from "cloudinary";

let configured = false;

function ensureCloudinaryConfigured(): void {
  if (configured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  configured = true;
}

export async function uploadBufferToCloudinary(
  file: Express.Multer.File,
  options: UploadApiOptions,
): Promise<UploadApiResponse> {
  ensureCloudinaryConfigured();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error ?? new Error("Cloudinary upload failed"));
        return;
      }
      resolve(result);
    });

    stream.end(file.buffer);
  });
}

function extractPublicIdFromUrl(url: string): string | null {
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  let path = url.slice(idx + marker.length);
  path = path.replace(/^v\d+\//, "");
  path = path.replace(/\.[^/.]+$/, "");

  return path || null;
}

export async function deleteCloudinaryAssetByUrl(url: string | null | undefined): Promise<void> {
  if (!url || !url.includes("/upload/")) return;

  ensureCloudinaryConfigured();
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch {
    // Ignore image deletion failure and try raw in case it is a document.
  }

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
  } catch {
    // Best effort cleanup.
  }
}

