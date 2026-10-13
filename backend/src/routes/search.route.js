const express = require("express");
const { globalSearch } = require("../controllers/search.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", authMiddleware, globalSearch);

module.exports = router;
