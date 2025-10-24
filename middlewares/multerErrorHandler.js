const { sendResponse } = require('../utils/responseHandler');

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Handle Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendResponse(res, 400, "error", "File size too large. Maximum size is 5MB");
    }
    return sendResponse(res, 400, "error", `File upload error: ${err.message}`);
  } else if (err) {
    // Handle other errors that occurred during file upload
    return sendResponse(res, 400, "error", err.message);
  }
  next();
};

module.exports = { handleMulterError };