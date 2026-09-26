import authService from "../services/authService.js";

const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    res.cookie("token", result.token, AUTH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const result = await authService.verifyEmail(req.body);
    res.cookie("token", result.token, AUTH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const result = await authService.resendOtp(req.body.email);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie("token", result.token, AUTH_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Sign in successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    res.clearCookie("token", {
      ...AUTH_COOKIE_OPTIONS,
      maxAge: 0,
    });
    res.status(200).json({
      success: true,
      message: "Successfully signed out",
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const avatarUrl = req.fileUrl;
    if (!avatarUrl) {
      return res.status(400).json({ success: false, message: "No avatar image provided" });
    }

    const updatedUser = await authService.updateAvatar(req.user._id, avatarUrl, req.user.role);

    res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully",
      data: {
        avatarUrl: updatedUser.avatarUrl,
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeAvatar = async (req, res, next) => {
  try {
    await authService.updateAvatar(req.user._id, null, req.user.role);

    res.status(200).json({
      success: true,
      message: "Profile photo removed successfully",
      data: {
        avatarUrl: null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone, cnic } = req.body;
    const updatedUser = await authService.updateProfile(
      req.user._id,
      { name, email, phone, cnic },
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: "Profile details updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required" });
    }

    await authService.changePassword(req.user._id, currentPassword, newPassword, req.user.role);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

export default {
  signup,
  verifyEmail,
  resendOtp,
  forgotPassword,
  resetPassword,
  login,
  logout,
  me,
  uploadAvatar,
  removeAvatar,
  updateProfile,
  changePassword,
};
