import mongoose from "mongoose";

const platformSettingSchema = new mongoose.Schema(
  {
    platformName: {
      type: String,
      default: "CityRock",
      trim: true,
    },
    platformTagline: {
      type: String,
      default: "Cloud Retail Management Platform",
      trim: true,
    },
    platformLogoUrl: {
      type: String,
      default: null,
    },
    supportEmail: {
      type: String,
      default: "support@cityrock.pk",
      trim: true,
    },
    superAdminDisplayName: {
      type: String,
      default: "Platform Admin",
      trim: true,
    },
    superAdminAvatarUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSetting = mongoose.model("PlatformSetting", platformSettingSchema);

export default PlatformSetting;
