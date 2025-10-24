const sendResponse = (res, statusCode, status, message, data = null) => {
    const response = {
        status_code: statusCode,
        status,
        message,
        timestamp: new Date().toISOString()
    };
    
    if (data) response.data = data;
    return res.status(statusCode).json(response);
};

const sendError = (res, error) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    const status = error.status || 'error';
    
    return sendResponse(res, statusCode, status, message, 
        process.env.NODE_ENV === 'development' ? { stack: error.stack } : null
    );
};

module.exports = { sendResponse, sendError };