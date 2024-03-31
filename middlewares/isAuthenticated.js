const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
	// If there is a token search for user with the same in DDB
	if (req.headers.authorization) {
		const user = await User.findOne({
			token: req.headers.authorization.replace("Bearer ", ""),
		});

		// If there is none -> error
		if (!user) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			// Return the user's info from DDB
			req.user = user;
			return next();
		}
	} else {
		return res.status(401).json({ message: "Unauthorized to do this action." });
	}
};

module.exports = isAuthenticated;
