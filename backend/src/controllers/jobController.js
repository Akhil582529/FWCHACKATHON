import Job from "../models/Job.js";
import User from "../models/User.js";

// GET /api/jobs — all active jobs
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true })
      .populate("postedBy", "fullName email companyId")
      .sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/jobs/my — HR: jobs posted by me
export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user._id })
      .populate("applicants.candidate", "fullName email skills resumeUrl")
      .sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/jobs — HR: create job
export const createJob = async (req, res) => {
  try {
    const { title, company, description, requirements, skills, location, salaryRange, type } = req.body;
    if (!title || !description || !company)
      return res.status(400).json({ success: false, message: "Title, company and description are required" });

    const job = await Job.create({
      title, company, description,
      requirements: requirements || [],
      skills: skills || [],
      location, salaryRange, type,
      postedBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Job posted successfully", job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/jobs/:id — HR: delete own job
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/jobs/:id/apply — Candidate: apply
export const applyToJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || !job.isActive)
      return res.status(404).json({ success: false, message: "Job not found" });

    const already = job.applicants.find(
      (a) => a.candidate.toString() === req.user._id.toString()
    );
    if (already)
      return res.status(409).json({ success: false, message: "Already applied to this job" });

    job.applicants.push({ candidate: req.user._id });
    await job.save();
    res.json({ success: true, message: "Applied successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/jobs/applied — Candidate: jobs I applied to
export const getAppliedJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ "applicants.candidate": req.user._id, isActive: true })
      .populate("postedBy", "fullName companyId")
      .select("title company location type salaryRange applicants createdAt");

    const result = jobs.map((j) => {
      const app = j.applicants.find((a) => a.candidate.toString() === req.user._id.toString());
      return {
        _id: j._id,
        title: j.title,
        company: j.company,
        location: j.location,
        type: j.type,
        salaryRange: j.salaryRange,
        appliedAt: app?.appliedAt,
        status: app?.status,
        aiScore: app?.aiScore,
      };
    });
    res.json({ success: true, jobs: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: get all jobs
export const adminGetAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("postedBy", "fullName email companyId")
      .sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Admin: toggle job active status
export const toggleJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    job.isActive = !job.isActive;
    await job.save();
    res.json({ success: true, message: `Job ${job.isActive ? "activated" : "deactivated"}`, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};