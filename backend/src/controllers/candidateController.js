import User from "../models/User.js";

// PUT /api/candidate/profile — update profile + skills
export const updateProfile = async (req, res) => {
  try {
    const { fullName, skills, resumeUrl, resumeText } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (fullName   !== undefined)  user.fullName   = fullName;
    if (skills)                    user.skills     = Array.isArray(skills) ? skills : skills.split(",").map((s) => s.trim());
    if (resumeUrl  !== undefined)  user.resumeUrl  = resumeUrl;
    if (resumeText !== undefined)  user.resumeText = resumeText;

    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: "Profile updated", user: user.profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/candidate/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/candidate/onboarding — fetch generated onboarding plan
export const getOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("onboardingJobId", "title company");

    if (!user.onboardingPlan)
      return res.json({ success: true, plan: null });

    res.json({
      success: true,
      plan:              user.onboardingPlan,
      jobTitle:          user.onboardingJobId?.title          || null,
      jobCompany:        user.onboardingJobId?.company        || null,
      generatedAt:       user.onboardingGeneratedAt,
      roleReadinessScore: user.roleReadinessScore,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};