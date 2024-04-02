"use strict";

const express = require("express");
const fileUpload = require("express-fileupload");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

// MODELS
const User = require("../models/User");
const Offer = require("../models/Offer");
const Payment = require("../models/Payment");

// Manage all image uploading, deleting, ...
const cloudinaryFunc = require("../functions/cloudinaryFunc");
// The path to move the image for this project on Cloudinary
const avatarFolderRootPath = "vinted/avatar";

const router = express.Router();

// Create an account --------------------------------------------------------------------
router.post("/user/signup", fileUpload(), async (req, res) => {
	try {
		// The body parameters
		const { username, email, password } = req.body;

		// Search an user with same mail in DDB
		const userDoc = await User.findOne({ email: email });

		// Conditions of errors
		// Body missing or wrong type
		if (
			username === undefined ||
			email === undefined ||
			password === undefined ||
			typeof username !== "string" ||
			typeof email !== "string" ||
			typeof password !== "string"
		) {
			return res.status(400).json({
				message: "Missing parameters",
			});
			// not an email format
		} else if (
			email.trim().split(/[@.]/).length < 3 ||
			email.indexOf(".") === email.length - 1
		) {
			return res.status(400).json({
				message: "Please use a valid email address.",
			});
			// if there already is an account with this email
		} else if (userDoc !== null) {
			return res.status(409).json({
				message: "This email already has an account",
			});
		}

		// all the variables to encrypt the user's password
		const saltGenerate = uid2(16);
		const hashGenerate = SHA256(password + saltGenerate).toString(encBase64);
		const tokenGenerate = uid2(64);

		// Create the user
		const newUser = new User({
			account: { username: username },
			email: email,
			salt: saltGenerate,
			hash: hashGenerate,
			token: tokenGenerate,
		});

		// Check if there is an avatar picture
		// If there is create it, move it to the right path in Cloudinary then add it to the user object in DDN
		if (req.files) {
			const avatarCreated = await cloudinaryFunc.deleteCreateFiles(
				req.files.avatar,
				null
			);
			const avatarFiled = await cloudinaryFunc.createFolder(
				newUser._id,
				avatarCreated.public_id,
				avatarFolderRootPath
			);
			newUser.account.avatar = avatarFiled;
		}

		await newUser.save();

		return res.status(201).json({
			message: `Your Vinted account was successfully created ${username}. You can now use your email ${email} to login.`,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

// Login to the website --------------------------------------------------------------------
router.post("/user/login", async (req, res) => {
	try {
		// The body parameters
		const { email, password } = req.body;

		// Search an user with same mail in DDB
		const userDoc = await User.findOne({ email: email });

		// Conditions of errors
		// Body missing or wrong type
		if (
			email === undefined ||
			password === undefined ||
			typeof email !== "string" ||
			typeof password !== "string"
		) {
			return res.status(400).json({
				message: "User not found",
			});
			// User not found in DDB
		} else if (userDoc === null) {
			return res.status(400).json({
				message: "User not found",
			});
		}

		// all the variables to encrypt the user's typed password
		const saltUser = userDoc.salt;
		const hashUser = userDoc.hash;
		const hashToTest = SHA256(password + saltUser).toString(encBase64);

		// Check is the user's typed password is the same as the one found in DDB for this email
		if (hashToTest === hashUser) {
			// Send the token for cookie
			const result = {
				token: userDoc.token,
				account: { username: userDoc.account.username },
			};

			return res.status(200).json(result);
		} else {
			return res.status(400).json({ message: "Wrong password." });
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

module.exports = router;
