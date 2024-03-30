"use strict";

const express = require("express");
const fileUpload = require("express-fileupload");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const User = require("../models/User");
const Offer = require("../models/Offer");
const cloudinaryFunc = require("../functions/cloudinaryFunc");

const router = express.Router();

const avatarFolderRootPath = "vinted/avatar";

router.post("/user/signup", fileUpload(), async (req, res) => {
	try {
		const usernameBody = req.body.username;
		const emailBody = req.body.email;
		const passwordBody = req.body.password;

		const userDoc = await User.findOne({ email: emailBody });

		if (
			usernameBody === undefined ||
			emailBody === undefined ||
			passwordBody === undefined ||
			typeof usernameBody !== "string" ||
			typeof emailBody !== "string" ||
			typeof passwordBody !== "string"
		) {
			return res.status(400).json({
				message: "Missing parameters",
			});
		} else if (emailBody.split("@").length > 2) {
			return res.status(400).json({
				message: "Please use a valid email address.",
			});
		} else if (userDoc !== null) {
			return res.status(409).json({
				message: "This email already has an account",
			});
		}

		const saltGenerate = uid2(16);
		const hashGenerate = SHA256(passwordBody + saltGenerate).toString(
			encBase64
		);
		const tokenGenerate = uid2(64);

		const newUser = new User({
			account: { username: usernameBody },
			email: emailBody,
			salt: saltGenerate,
			hash: hashGenerate,
			token: tokenGenerate,
		});

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
			message: `Your Vinted account was successfully created ${usernameBody}. You can now use your email ${emailBody} to login.`,
		});
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

router.post("/user/login", async (req, res) => {
	try {
		const emailBody = req.body.email;
		const passwordBody = req.body.password;
		const userDoc = await User.findOne({ email: emailBody });

		if (
			emailBody === undefined ||
			passwordBody === undefined ||
			typeof emailBody !== "string" ||
			typeof passwordBody !== "string"
		) {
			return res.status(400).json({
				message: "User not found",
			});
		} else if (userDoc === null) {
			return res.status(400).json({
				message: "User not found",
			});
		}

		const saltUser = userDoc.salt;
		const hashUser = userDoc.hash;
		const hashToTest = SHA256(passwordBody + saltUser).toString(encBase64);

		if (hashToTest === hashUser) {
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
