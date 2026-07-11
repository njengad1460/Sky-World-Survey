const express = require("express");
const router = express.Router();
const surveyController = require("../controllers/surveyController");
const { checkAuth, requireAdmin } = require("../middleware/auth");

router.post("/", checkAuth, requireAdmin, surveyController.createSurvey);
router.get("/", surveyController.getSurveys);
router.put("/:surveyId", checkAuth, requireAdmin, surveyController.updateSurvey);
router.delete("/:surveyId", checkAuth, requireAdmin, surveyController.deleteSurvey);

router.post("/:surveyId/questions", checkAuth, requireAdmin, surveyController.createQuestion);
router.get("/:surveyId/questions", surveyController.getSurveyQuestions);
router.put("/:surveyId/questions/:questionId", checkAuth, requireAdmin, surveyController.updateQuestion);
router.delete("/:surveyId/questions/:questionId", checkAuth, requireAdmin, surveyController.deleteQuestion);

module.exports = router;
