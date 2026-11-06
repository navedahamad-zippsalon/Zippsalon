const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-jwt-secret";

function generateTestToken(userIdOrOptions = "00000000-0000-4000-8000-000000000001", roles = ["ADMIN"]) {
  let userId = "00000000-0000-4000-8000-000000000001";
  let tokenRoles = roles;
  if (typeof userIdOrOptions === "object" && userIdOrOptions !== null) {
    userId = userIdOrOptions.userId || userId;
    tokenRoles = userIdOrOptions.roles || (userIdOrOptions.role ? [userIdOrOptions.role] : tokenRoles);
  } else if (typeof userIdOrOptions === "string") {
    userId = userIdOrOptions;
  }
  return jwt.sign({ userId, roles: tokenRoles }, JWT_SECRET, { expiresIn: "1h" });
}

function generateExpiredToken(userIdOrOptions = "00000000-0000-4000-8000-000000000001", roles = ["ADMIN"]) {
  let userId = "00000000-0000-4000-8000-000000000001";
  let tokenRoles = roles;
  if (typeof userIdOrOptions === "object" && userIdOrOptions !== null) {
    userId = userIdOrOptions.userId || userId;
    tokenRoles = userIdOrOptions.roles || (userIdOrOptions.role ? [userIdOrOptions.role] : tokenRoles);
  } else if (typeof userIdOrOptions === "string") {
    userId = userIdOrOptions;
  }
  return jwt.sign({ userId, roles: tokenRoles }, JWT_SECRET, { expiresIn: -10 });
}

module.exports = {
  generateTestToken,
  generateExpiredToken,
};

