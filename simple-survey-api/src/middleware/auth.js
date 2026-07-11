const { jwtVerifier } = require("../config/aws");

const getAllowedAdminGroups = () => {
  return (process.env.ADMIN_GROUP_NAMES || "admin,Admin,Admins")
    .split(",")
    .map(group => group.trim())
    .filter(Boolean);
};

const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    } else {
      return res.status(401).header('Content-Type', 'application/xml').send("<error><message>Missing Token</message></error>");
    }

    const payload = await jwtVerifier.verify(token);
    
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      groups: payload["cognito:groups"] || []
    };
    next();
  } catch (err) {
    res.status(401).header('Content-Type', 'application/xml').send("<error><message>Invalid Session</message></error>");
  }
};

const requireAdmin = (req, res, next) => {
  const allowedGroups = getAllowedAdminGroups();
  const userGroups = req.user?.groups || [];
  const isAdmin = userGroups.some(group => allowedGroups.includes(group));

  if (!isAdmin) {
    return res.status(403).header('Content-Type', 'application/xml').send("<error><message>Admin access required</message></error>");
  }

  next();
};

module.exports = {
  checkAuth,
  requireAdmin
};
