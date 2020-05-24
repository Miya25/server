const User = require("../../models/users");
const BannedIPs = require("../../models/BannedIPs");
const JWT = require("jsonwebtoken");
import config from '../../config';

function signToken(uniqueID) {
  return JWT.sign(uniqueID, config.jwtSecret);
}

module.exports = async (req, res, next) => {
  const { code, email } = req.body;

  // check if ip is banned
  const ipBanned = await BannedIPs.exists({ ip: req.userIP });
  if (ipBanned) {
    return res.status(401).json({
      error: "IP is banned."
    });
  }

  // Check if there is a user with the same email
  const foundUser = await User.findOne({ email: email.toLowerCase() }).select(
    "uniqueID email_confirm_code"
  );
  if (!foundUser) {
    return res.status(404).json({
      error:"Invalid email."
    });
  }
  if (!foundUser.email_confirm_code) {
    return res.status(401).json({
      error: "Email already confirmed."
    });
  }

  if (code !== foundUser.email_confirm_code) {
    return res.status(401).json({
      error:"Invalid code."
    });
  }

  await User.updateOne({_id: foundUser._id}, {$unset: {email_confirm_code: 1}})

  // Generate the token without header information
  const token = signToken(foundUser.uniqueID)
    .split(".")
    .splice(1)
    .join(".");

  // Respond with user
  res.send({
    token
  });
};
