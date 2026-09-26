export const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    return res.status(403).json({
      success: false,
      message: "Tenant context is required. This account is not associated with an active tenant store.",
    });
  }
  next();
};

export const requireStore = (req, res, next) => {
  const storeId = req.headers["x-store-id"] || req.query.storeId || req.storeId;
  if (!storeId || storeId === "all") {
    return res.status(400).json({
      success: false,
      message: "A specific store location must be selected for this operation",
    });
  }
  req.activeStoreId = storeId.toString();

  // Strict enforcement: Inject tenantId and storeId directly into body/query
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    req.body.storeId = req.activeStoreId;
    if (req.tenantId) req.body.tenantId = req.tenantId;
  }
  if (req.method === "GET" || req.method === "DELETE") {
    req.query.storeId = req.activeStoreId;
    if (req.tenantId) req.query.tenantId = req.tenantId;
  }

  next();
};

export default { requireTenant, requireStore };
