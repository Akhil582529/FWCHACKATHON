import User from "../models/User.js";
import Job from "../models/Job.js";
import Interview from "../models/Interview.js";

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const users = await User.find(filter).select("-passwordHash -adminKeyHash").sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/toggle — activate/deactivate
export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ success: false, message: "Cannot deactivate admin" });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? "activated" : "deactivated"}`, user: user.profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/analytics
export const getAnalytics = async (req, res) => {
  try {
    const [
      totalUsers, candidates, hrUsers, activeJobs, totalJobs,
      totalInterviews, recentUsers, recentJobs,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "candidate" }),
      User.countDocuments({ role: "hr" }),
      Job.countDocuments({ isActive: true }),
      Job.countDocuments(),
      Interview.countDocuments({ isMock: false }),
      User.find().sort({ createdAt: -1 }).limit(5).select("fullName email role createdAt isActive"),
      Job.find().sort({ createdAt: -1 }).limit(5).select("title company isActive createdAt").populate("postedBy", "companyId"),
    ]);

    // Applications count
    const jobsWithApps = await Job.find({}, "applicants");
    const totalApplications = jobsWithApps.reduce((sum, j) => sum + j.applicants.length, 0);

    // Monthly signups (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySignups = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      analytics: {
        totalUsers, candidates, hrUsers,
        admins: totalUsers - candidates - hrUsers,
        activeJobs, totalJobs, totalInterviews, totalApplications,
        recentUsers, recentJobs, monthlySignups,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};