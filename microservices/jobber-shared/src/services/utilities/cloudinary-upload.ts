import cloudinary, {
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

interface ICloudinaryUploadOptions {
  file: string;
  public_id?: string;
  overwrite?: boolean;
  invalidate?: boolean;
  resource_type?: 'auto' | 'image' | 'video' | 'raw';
}

type UploadResult = UploadApiResponse | UploadApiErrorResponse | undefined;

export class CloudinaryUploader {
  private static wrapCloudinaryApiCall<T>(
    apiCall: (callback: (error: any, result: T) => void) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      apiCall((error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error('No result from Cloudinary'));
        resolve(result);
      });
    });
  }

  private static isVideoFile(file: string): boolean {
    const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'webm'];
    const extension = file.split('.').pop()?.toLowerCase() || '';
    return videoExtensions.includes(extension);
  }

  public static async upload(
    options: ICloudinaryUploadOptions
  ): Promise<UploadResult> {
    const {
      file,
      public_id,
      overwrite = false,
      invalidate = false,
      resource_type = 'auto',
    } = options;

    const isVideo = this.isVideoFile(file);

    return this.wrapCloudinaryApiCall<UploadResult>((callback) => {
      cloudinary.v2.uploader.upload(
        file,
        {
          public_id,
          overwrite,
          invalidate,
          resource_type: isVideo ? 'video' : resource_type,
          ...(isVideo && { chunk_size: 6_000_000 }),
        },
        callback
      );
    });
  }

  public static async delete(
    public_id: string
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return this.wrapCloudinaryApiCall((callback) => {
      cloudinary.v2.uploader.destroy(public_id, callback);
    });
  }

  public static async deleteMultiple(
    public_ids: string[]
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return this.wrapCloudinaryApiCall((callback) => {
      cloudinary.v2.api.delete_resources(public_ids, callback);
    });
  }
}
