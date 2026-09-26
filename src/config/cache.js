import { LRUCache } from "lru-cache";

// High-performance in-memory cache with 60-second TTL default
const lru = new LRUCache({
  max: 5000,
  ttl: 1000 * 60, // 60 seconds TTL default
  allowStale: false,
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

// Bounded registry of keys grouped by namespace:tenantId to prevent memory leaks
const namespaceRegistry = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 15, // 15 minutes TTL
});

const trackKey = (namespaceKey, cacheKey) => {
  let set = namespaceRegistry.get(namespaceKey);
  if (!set) {
    set = new Set();
    namespaceRegistry.set(namespaceKey, set);
  }
  set.add(cacheKey);
};

export const cacheService = {
  get: (key) => lru.get(key),

  set: (key, value, ttl = 1000 * 60, namespace = null, tenantId = "global", storeId = "global") => {
    lru.set(key, value, { ttl });
    if (namespace) {
      const nsKey = `${namespace}:${tenantId}:${storeId}`;
      trackKey(nsKey, key);
    }
  },

  delete: (key) => lru.delete(key),

  // Invalidate all cached entries for a specific resource, tenant, and store
  invalidate: (namespaces = [], tenantId = "global", storeId = "global") => {
    const list = Array.isArray(namespaces) ? namespaces : [namespaces];
    for (const ns of list) {
      const nsKey = `${ns}:${tenantId}:${storeId}`;
      const keys = namespaceRegistry.get(nsKey);
      if (keys) {
        for (const k of keys) {
          lru.delete(k);
        }
        namespaceRegistry.delete(nsKey);
      }
      // Also check global namespace if applicable
      if (tenantId !== "global") {
        const globalKey = `${ns}:global`;
        const gKeys = namespaceRegistry.get(globalKey);
        if (gKeys) {
          for (const k of gKeys) {
            lru.delete(k);
          }
          namespaceRegistry.delete(globalKey);
        }
      }
    }
  },

  clearAll: () => {
    lru.clear();
    namespaceRegistry.clear();
  },

  size: () => lru.size,
};

export default cacheService;
