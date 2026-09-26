import { Router } from "express";
import productController from "../controllers/productController.js";
import { authenticate } from "../middleware/auth.js";
import { requireTenant, requireStore } from "../middleware/tenantScope.js";
import { uploadMemory, uploadFile } from "../middleware/upload.js";
import { cacheEndpoint } from "../middleware/cacheMiddleware.js";

const router = Router();

router.use(authenticate);
router.use(requireTenant);
router.use(requireStore);

router.get("/template", productController.downloadTemplate);
router.get("/import/template", productController.downloadTemplate);
router.get("/export", productController.exportExcel);
router.post("/import", uploadMemory.single("file"), productController.importExcel);
router.post("/upload-image", uploadFile("image", "cityrock/products"), (req, res) => {
  res.status(200).json({ success: true, url: req.fileUrl });
});

router.get("/", cacheEndpoint("products", 60 * 1000), productController.list);
router.get("/:id", productController.getProduct);
router.post("/", uploadFile("image", "cityrock/products"), productController.create);
router.put("/:id", uploadFile("image", "cityrock/products"), productController.update);
router.patch("/:id", uploadFile("image", "cityrock/products"), productController.update);
router.delete("/:id", productController.deleteProduct);

export default router;
