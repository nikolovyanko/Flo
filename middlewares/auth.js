
export const validateApiKey = (req, res, next) => {
  const API_KEY = req.header("Authorization");
  if (API_KEY !== process.env.OPEN_AI_API_KEY) {
    return res.status(401).json({ error: "Unauthorized!" });
  }
  next();
};