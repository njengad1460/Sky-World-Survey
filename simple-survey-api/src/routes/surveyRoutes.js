const express = require("express");
const router = express.Router();
const surveyController = require("../controllers/surveyController");
const checkAuth = require("../middleware/auth");

router.post("/", checkAuth, surveyController.createSurvey);
router.get("/", surveyController.getSurveys);

router.post("/:surveyId/questions", checkAuth, surveyController.createQuestion);
router.get("/:surveyId/questions", surveyController.getSurveyQuestions);

module.exports = router;