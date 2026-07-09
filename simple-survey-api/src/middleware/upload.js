const multer = require("multer");

const storage = multer.memoryStorage();

const uploadFields = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB temporary fallback ceiling limit
}).any();

module.exports = uploadFields;