"use strict";

const express = require("express");
const stripe = require("stripe")(process.env.STRIPE);

const router = express.Router();

router.post("/payment", async (req, res) => {
	try {
		// Create a PaymentIntent
		const paymentIntent = await stripe.paymentIntents.create({
			// Amount sent by the request transform in cents
			amount: Number((req.body.amount * 100).toFixed(0)),
			currency: "eur",
			// Offer's title sent by the request
			description: req.body.title,
		});

		res.json(paymentIntent);
	} catch (error) {
		console.log(error.message);
		return res.status(500).json({ message: error.message });
	}
});

module.exports = router;
