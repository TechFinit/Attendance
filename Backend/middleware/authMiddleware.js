module.exports = (req, res, next) => {

  const role = req.headers.authorization;

  if (role !== "admin" && role !== "tl") {

    return res.status(403).json({
      error: "Access Denied",
    });

  }

  next();
};