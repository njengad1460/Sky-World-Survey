// simple-survey-api/src/routes/responseRoutes.js
const express = require("express");
const router = express.Router();
const responseController = require("../controllers/responseController");
const checkAuth = require("../middleware/auth");
const uploadFields = require("../middleware/upload");

router.post("/surveys/:surveyId/responses", checkAuth, uploadFields, responseController.submitResponse);
router.get("/surveys/:surveyId/responses", checkAuth, responseController.getSurveyResponses);
router.get("/certificates/:id", checkAuth, responseController.downloadCertificate);

module.exports = router;