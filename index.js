require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// ROUTES
const userRoutes = require("./routes/user");
const offerRoutes = require("./routes/offer");
const paymentRoutes = require("./routes/payment");

// A try catch to contact the DDB
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		const app = express();
		app.use(cors());
		app.use(express.json());
		app.use(userRoutes);
		app.use(offerRoutes);
		app.use(paymentRoutes);

		app.all("/", (req, res) => {
			res.status(200).json({
				message: "Bienvenue sur Vinted ! (pas le vrai c'est un exercice)",
			});
		});

		app.all("*", (req, res) => {
			res.status(404).json({ message: "Page not found" });
		});

		app.listen(process.env.PORT, () => {
			console.log("SERVER ON");
		});
	})
	.catch((error) => {
		console.error(error.message);
	});
