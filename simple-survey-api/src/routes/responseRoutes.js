const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const { checkAuth, requireAdmin } = require("../middleware/auth");
const uploadFields = require("../middleware/upload");

router.post("/surveys/:surveyId/responses", checkAuth, uploadFields, responseController.submitResponse);
router.get("/surveys/:surveyId/responses", checkAuth, requireAdmin, responseController.getSurveyResponses);
router.get("/certificates/:id", checkAuth, requireAdmin, responseController.downloadCertificate);

module.exports = router;
