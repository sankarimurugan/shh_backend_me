const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: "error",
            message: err.message
        });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({
            status: "error",
            message: "Invalid ID format"
        });
    }

    res.status(500).json({
        status: "error",
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
};

module.exports = errorHandler;