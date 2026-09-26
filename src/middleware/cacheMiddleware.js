import { cacheService } from "../config/cache.js";

/**
 * Cache middleware for GET endpoints
 * Default TTL: 60 seconds (as required by best practices)
 */
export const cacheEndpoint = (namespace, ttl = 60 * 1000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const tenantId = req.tenantId || "global";
    const storeId = req.activeStoreId || req.storeId || req.query.storeId || "global";
    const cacheKey = `route:${namespace}:${tenantId}:${storeId}:${req.originalUrl}`;

    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      res.setHeader("X-Cache", "HIT");
      return res.status(200).json(cachedData);
    }

    // Intercept res.json to populate cache
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body && body.success !== false) {
        cacheService.set(cacheKey, body, ttl, namespace, tenantId, storeId);
      }
      res.setHeader("X-Cache", "MISS");
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache helper
 * Call whenever a create, update, or delete mutation occurs
 */
export const clearCache = (namespaces, tenantId = "global", storeId = "global") => {
  cacheService.invalidate(namespaces, tenantId, storeId);
};

export default { cacheEndpoint, clearCache };
