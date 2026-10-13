const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {

    try {

        let token = req.headers.authorization?.split(" ")[1];

        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                message: "Please login"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });

    }
};

module.exports = authMiddleware;