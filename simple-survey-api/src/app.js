const express = require("express");
const cors = require("cors");
const xmlparser = require("express-xml-bodyparser");
const surveyRoutes = require("./routes/surveyRoutes");
const responseRoutes = require("./routes/responseRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Explicit xml parser registration to preserve system format structures
app.use(xmlparser({
  explicitArray: false,
  normalize: true,
  normalizeTags: true
}));

// Route Mapping bindings
app.use("/api/surveys", surveyRoutes);
app.use("/api", responseRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server executing safely on local port: ${PORT}`);
});

module.exports = app;