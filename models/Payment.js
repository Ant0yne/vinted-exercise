const mongoose = require("mongoose");

const Payment = mongoose.model("Payment", {
	amount: { type: Number, required: true },
	offer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Offer",
		required: true,
	},
	owner: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	buyer: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	date: { type: Date, required: true },
});

module.exports = Payment;
