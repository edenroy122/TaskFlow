const errorMiddleware = (err, req, res, next) => {
    console.error("Global Error Handler:", err);

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal server error";

    res.status(statusCode).json({
        message
    });
};

module.exports = errorMiddleware;
