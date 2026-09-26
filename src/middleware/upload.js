import multer from "multer";
import path from "path";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "../config/cloudinary.js";

const memoryStorage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|pdf|csv|xlsx|xls/;
  const extname = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowed.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Unsupported file type. Only standard images, PDFs, and spreadsheets are permitted."));
};

const multerMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
});

/**
 * Upload single file directly to Cloudinary (in-memory streaming)
 * Zero temporary files written to local disk
 */
export const uploadFile = (fieldName = "file", folder = "cityrock/general") => {
  return async (req, res, next) => {
    multerMemory.any()(req, res, async (err) => {
      if (err) return next(err);
      const file = req.files && req.files.length > 0 ? req.files[0] : req.file;
      if (!file) return next();

      if (isCloudinaryConfigured()) {
        try {
          const result = await uploadBufferToCloudinary(file.buffer, folder);
          req.fileUrl = result.secure_url;
          req.cloudinaryPublicId = result.public_id;
          req.fileData = {
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          };
          return next();
        } catch (uploadError) {
          console.error("[Upload] Cloudinary upload failed:", uploadError.message);
          if (process.env.NODE_ENV === "production") {
            return next(new Error("Cloud storage upload failed. Please try again."));
          }
        }
      }

      // If Cloudinary is not configured or in dev fallback:
      // Produce an in-memory Data URI so files are NEVER written to local disk
      const base64Data = file.buffer.toString("base64");
      const dataUri = `data:${file.mimetype};base64,${base64Data}`;
      req.fileUrl = dataUri;
      req.fileData = {
        url: dataUri,
        bytes: file.size,
        mimetype: file.mimetype,
      };
      next();
    });
  };
};

/**
 * Upload multiple files directly to Cloudinary (in-memory streaming)
 * Zero temporary files written to local disk
 */
export const uploadFiles = (fieldName = "files", maxCount = 10, folder = "cityrock_pos") => {
  return async (req, res, next) => {
    multerMemory.array(fieldName, maxCount)(req, res, async (err) => {
      if (err) return next(err);
      if (!req.files || req.files.length === 0) return next();

      if (isCloudinaryConfigured()) {
        try {
          const uploadPromises = req.files.map((file) =>
            uploadBufferToCloudinary(file.buffer, folder)
          );
          const results = await Promise.all(uploadPromises);

          req.fileUrls = results.map((r) => r.secure_url);
          req.cloudinaryPublicIds = results.map((r) => r.public_id);
          return next();
        } catch (uploadError) {
          console.error("[Upload] Multi-file Cloudinary upload failed:", uploadError.message);
          if (process.env.NODE_ENV === "production") {
            return next(new Error("Cloud storage upload failed. Please try again."));
          }
        }
      }

      // Dev fallback: in-memory Data URIs without disk writes
      req.fileUrls = req.files.map(
        (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
      );
      next();
    });
  };
};

export const uploadMemory = multerMemory;

export default { uploadFile, uploadFiles, uploadMemory };
