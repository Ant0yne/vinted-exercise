const mongoose = require("mongoose");

const User = mongoose.model("User", {
	account: {
		username: { type: String, required: true },
		avatar: { type: Object, default: null },
	},
	email: { type: String, required: true },
	salt: { type: String, required: true },
	hash: { type: String, required: true },
	token: { type: String, required: true },
	newsletter: { type: Boolean, default: false },
});

module.exports = User;
