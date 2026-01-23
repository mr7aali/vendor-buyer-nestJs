// cloudinary.service.ts
import { Injectable, BadRequestException } from "@nestjs/common";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryResponse } from "./cloudinary/cloudinary-response";
import streamifier from "streamifier";

@Injectable()
export class CloudinaryService {
  // Allowed image MIME types
  private readonly allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
  ];

  // Max file size: 5MB
  private readonly maxFileSize = 5 * 1024 * 1024;

  uploadFile(
    file: Express.Multer.File,
    folder: string = "uploads",
  ): Promise<CloudinaryResponse> {
    // Validate file
    this.validateFile(file);

    return new Promise<CloudinaryResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "image",
          transformation: [
            { width: 1000, height: 1000, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          if (result) resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(", ")}`,
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   * Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/image.jpg
   * Returns: folder/image
   */
  extractPublicId(url: string): string {
    try {
      const parts = url.split("/");
      const uploadIndex = parts.indexOf("upload");

      if (uploadIndex === -1) {
        throw new Error("Invalid Cloudinary URL");
      }

      // Get everything after 'upload/v{version}/'
      const pathAfterUpload = parts.slice(uploadIndex + 2).join("/");

      // Remove file extension
      const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");

      return publicId;
    } catch (error) {
      throw new BadRequestException(`Invalid Cloudinary URL: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteFile(publicId: string): Promise<any> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      throw new BadRequestException(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Delete image from Cloudinary using URL
   */
  async deleteFileByUrl(url: string): Promise<any> {
    const publicId = this.extractPublicId(url);
    return this.deleteFile(publicId);
  }
}
