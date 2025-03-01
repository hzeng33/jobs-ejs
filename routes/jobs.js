const express = require("express");
const {
  jobsNew,
  deleteJob,
  updateJob,
  createJob,
  getAllJobs,
  getJob,
} = require("../controllers/jobs");

const router = express.Router();

router.route("/").get(getAllJobs).post(createJob);
router.get("/new", jobsNew);
router.get("/edit/:id", getJob);
router.post("/update/:id", updateJob);
router.post("/delete/:id", deleteJob);

module.exports = router;
