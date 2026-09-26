import Subscription from "../models/Subscription.js";
import { cacheService } from "../config/cache.js";

export const checkSubscriptionStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return next();

    const cacheKey = `sub:${tenantId}`;
    let sub = cacheService.get(cacheKey);

    if (!sub) {
      sub = await Subscription.findOne({ tenantId }).populate("planId").lean();
      if (sub) {
        // Cache subscription status for 60 seconds
        cacheService.set(cacheKey, sub, 1000 * 60, "subscription", tenantId);
      }
    }

    if (!sub) {
      return res.status(403).json({
        success: false,
        message: "No active subscription plan found. Please select a plan to continue.",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    const now = new Date();

    // Check trial expiration
    if (sub.status === "trial" && sub.currentPeriodEnd) {
      const trialEndDate = new Date(sub.currentPeriodEnd);
      if (now > trialEndDate) {
        // 3-day grace period from trial end
        const graceEndDate = new Date(trialEndDate.getTime() + 3 * 24 * 60 * 60 * 1000);
        if (now > graceEndDate) {
          // Grace period fully expired, lock access
          return res.status(403).json({
            success: false,
            message: "Your 14-day free trial has expired. Please activate a plan in Billing to continue processing sales.",
            code: "TRIAL_EXPIRED",
          });
        }
        // Within 3-day grace period: tag request context
        req.trialGracePeriod = true;
      }
    }

    if (sub.status === "suspended" || sub.status === "expired") {
      return res.status(403).json({
        success: false,
        message: "Your subscription has expired or has been suspended. Please renew to continue selling.",
        code: "SUBSCRIPTION_SUSPENDED",
      });
    }

    if (sub.status === "grace_period" && sub.graceEndsAt && now > new Date(sub.graceEndsAt)) {
      return res.status(403).json({
        success: false,
        message: "Grace period has ended. Access is locked pending payment confirmation.",
        code: "GRACE_PERIOD_EXPIRED",
      });
    }

    req.subscription = sub;
    next();
  } catch (error) {
    next(error);
  }
};

export default { checkSubscriptionStatus };
