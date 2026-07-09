const { jwtVerifier } = require("../config/aws");

const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).header('Content-Type', 'application/xml').send("<error><message>Missing Token</message></error>");
    }

    const token = authHeader.split(" ")[1];
    const payload = await jwtVerifier.verify(token);
    
    req.user = {
      id: payload.sub,
      username: payload.username
    };
    next();
  } catch (err) {
    res.status(401).header('Content-Type', 'application/xml').send("<error><message>Invalid Session</message></error>");
  }
};

module.exports = checkAuth;