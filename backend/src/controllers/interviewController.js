import Interview from "../models/Interview.js";
import Job from "../models/Job.js";

// POST /api/interviews — HR: schedule interview
export const scheduleInterview = async (req, res) => {
  try {
    const { candidateId, jobId, scheduledAt, mode, meetLink, notes } = req.body;
    if (!candidateId || !jobId || !scheduledAt)
      return res.status(400).json({ success: false, message: "candidateId, jobId and scheduledAt required" });

    const interview = await Interview.create({
      candidate: candidateId,
      job: jobId,
      scheduledBy: req.user._id,
      scheduledAt: new Date(scheduledAt),
      mode: mode || "online",
      meetLink: meetLink || null,
      notes: notes || null,
    });

    // Update applicant status to shortlisted
    await Job.updateOne(
      { _id: jobId, "applicants.candidate": candidateId },
      { $set: { "applicants.$.status": "shortlisted" } }
    );

    const populated = await Interview.findById(interview._id)
      .populate("candidate", "fullName email")
      .populate("job", "title company");

    res.status(201).json({ success: true, message: "Interview scheduled", interview: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/interviews/hr — HR: all interviews I scheduled
export const getHRInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ scheduledBy: req.user._id, isMock: false })
      .populate("candidate", "fullName email")
      .populate("job", "title company")
      .sort({ scheduledAt: 1 });
    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/interviews/candidate — Candidate: my scheduled interviews
export const getCandidateInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ candidate: req.user._id, isMock: false })
      .populate("scheduledBy", "fullName email companyId")
      .populate("job", "title company")
      .sort({ scheduledAt: 1 });
    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/interviews/:id/status — update status
export const updateInterviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("candidate", "fullName email").populate("job", "title");
    if (!interview) return res.status(404).json({ success: false, message: "Interview not found" });
    res.json({ success: true, interview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};