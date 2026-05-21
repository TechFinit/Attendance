const authMiddleware = (req, res, next) => {

  const role = req.headers.authorization;

  // ✅ CHECK ROLE
  if (role === "admin" || role === "tl") {

    next();

  } else {

    return res.status(401).json({
      error: "Unauthorized",
    });

  }
};

module.exports = authMiddleware;