import { v2 as cloudinary } from "cloudinary";

export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

export const getCloudinaryClient = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
};

export const uploadBufferToCloudinary = (buffer, folder = "cityrock/general") => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error("Cloudinary credentials are not configured"));
    }

    const client = getCloudinaryClient();
    const uploadStream = client.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = async (publicId) => {
  if (!isCloudinaryConfigured()) return;
  try {
    const client = getCloudinaryClient();
    await client.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary deletion failed:", error);
  }
};

export default cloudinary;
