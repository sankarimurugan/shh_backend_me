const jwt = require("jsonwebtoken");
require("dotenv").config();
const SECRET_KEY = process.env.JWT_SECRET;
const blacklist = new Set();
const Telecaller = require("../models/telecallermodel"); // Add this import

exports.authMiddleware = async (req, res, next) => {
  // Make this async
  // Get the token from Authorization header (case-insensitive)
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  console.log("Token from header:", token);

  if (!token) {
    console.log("No token found in header");
    return res.status(401).json({ message: "No token provided" });
  }

  // Remove extra quotes if any
  const cleanToken = token.replace(/^"(.*)"$/, "$1");

  if (blacklist.has(cleanToken)) {
    console.log("Token is blacklisted:", cleanToken);
    return res
      .status(401)
      .json({ message: "Token is blacklisted. Please log in again." });
  }

  try {
    // Verify the token using the secret
    const decoded = jwt.verify(cleanToken, SECRET_KEY);
    console.log("Decoded JWT:", decoded);

    // Attach the decoded user info to the request
    req.user = decoded;

    // Check if user is a telecaller and verify active status
    if (decoded.role === "Telecaller") {
      const telecaller = await Telecaller.findById(decoded.id);

      // If telecaller doesn't exist or is inactive, deny access
      if (!telecaller || !telecaller.active) {
        return res.status(403).json({
          message: "Your account has been deactivated. Please contact admin.",
          active: false,
        });
      }
    }

    next();
  } catch (err) {
    console.error("JWT verification error:", err);
    return res
      .status(401)
      .json({ message: "Invalid token", error: err.message });
  }
};
