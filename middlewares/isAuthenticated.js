const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
	if (req.headers.authorization) {
		const user = await User.findOne({
			token: req.headers.authorization.replace("Bearer ", ""),
		});

		if (!user) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			req.user = user;
			return next();
		}
	} else {
		return res.status(401).json({ message: "Unauthorized to do this action." });
	}
};

module.exports = isAuthenticated;
