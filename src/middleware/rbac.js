const PLATFORM_ROLES = [
  "super_admin",
  "platform_admin",
  "PLATFORM_ADMIN",
  "support_agent",
  "sales_onboarding",
];

const TENANT_ROLES = ["owner", "manager", "cashier"];

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = req.user.role;

    // Super admin bypass
    if (userRole === "super_admin" || userRole === "platform_admin" || userRole === "PLATFORM_ADMIN") {
      return next();
    }

    // Role category shortcuts
    if (allowedRoles.includes("platform") && PLATFORM_ROLES.includes(userRole)) {
      return next();
    }

    if (allowedRoles.includes("tenant") && TENANT_ROLES.includes(userRole)) {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Your role '${userRole}' does not have permission for this resource.`,
    });
  };
};

export const requirePlatformStaff = authorize("platform");
export const requireTenantOwner = authorize("owner");
export const requireStoreStaff = authorize("owner", "manager", "cashier");

export default {
  authorize,
  requirePlatformStaff,
  requireTenantOwner,
  requireStoreStaff,
};
