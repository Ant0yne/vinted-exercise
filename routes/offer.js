"use strict";

const express = require("express");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
const User = require("../models/User");
const Offer = require("../models/Offer");
// return the user document (from MDB) of the user in req.user
const isAuthenticated = require("../middlewares/isAuthenticated");
const cloudinaryFunc = require("../functions/cloudinaryFunc");
const isObjectPopulate = require("../functions/isObjectPopulate");

const router = express.Router();

const maxPriceOfferGlobal = 100000;
const titleMaxStrLength = 50;
const descrMaxStrLength = 500;
const offerFolderRootPath = "vinted/offers";
const maxPageNumber = 1000;

/**
 * Create an offer
 */
router.post(
	"/offer/publish",
	isAuthenticated,
	fileUpload(),
	cloudinaryFunc.middlewareFileCheck,
	async (req, res) => {
		try {
			let { title, description, price, condition, city, brand, size, color } =
				req.body;

			if (
				title === undefined ||
				typeof title !== "string" ||
				description === undefined ||
				typeof description !== "string" ||
				price === undefined ||
				isNaN(price) ||
				typeof condition !== "string" ||
				typeof city !== "string" ||
				typeof brand !== "string" ||
				typeof color !== "string" ||
				(typeof size !== "string" && isNaN(size)) ||
				title.length > titleMaxStrLength ||
				description.length > descrMaxStrLength ||
				price > maxPriceOfferGlobal ||
				condition.length > titleMaxStrLength ||
				city.length > titleMaxStrLength ||
				brand.length > titleMaxStrLength ||
				color.length > titleMaxStrLength ||
				(typeof size === "string" && size.length > titleMaxStrLength) ||
				(typeof size === "number" && size > maxPriceOfferGlobal)
			) {
				return res.status(400).json({
					message:
						"Please fill all the mandatory fields with the right type of parameters and respecting the text limitation.",
				});
			}

			if (condition === undefined) {
				condition = "";
			}
			if (city === undefined) {
				city = "";
			}
			if (size === undefined) {
				size = "";
			}
			if (color === undefined) {
				color = "";
			}

			const detailsBody = [
				{ MARQUE: brand },
				{ TAILLE: size },
				{ ÉTAT: condition },
				{ COULEUR: color },
				{ EMPLACEMENT: city },
			];

			const fileUploaded = await cloudinaryFunc.deleteCreateFiles(
				req.files.image,
				null
			);

			// console.log("Etape 3 : ", fileUploaded);
			const newOffer = new Offer({
				product_name: title,
				product_description: description,
				product_price: price,
				product_details: detailsBody,
				product_image: fileUploaded,
				owner: req.user,
			});

			// console.log("Etape 4 : ", newOffer.product_image.public_id);

			const filMoveToFolder = await cloudinaryFunc.createFolder(
				newOffer._id,
				newOffer.product_image.public_id,
				offerFolderRootPath
			);

			newOffer.product_image = filMoveToFolder;

			if (req.files.pictures) {
				console.log(Array.isArray(req.files.pictures));
				if (Array.isArray(req.files.pictures)) {
					const arrayPictures = [...req.files.pictures];
					const picturesFilesPromises = arrayPictures.map((picture) => {
						return cloudinaryFunc.deleteCreateFiles(picture, null);
					});
					const picturesToFile = await Promise.all(picturesFilesPromises);

					const picturesFolderPromises = picturesToFile.map((picture) => {
						return cloudinaryFunc.createFolder(
							newOffer._id,
							picture.public_id,
							offerFolderRootPath
						);
					});

					const picturesToUpload = await Promise.all(picturesFolderPromises);
					newOffer.product_pictures = picturesToUpload;
				} else {
					const fileUploaded = await cloudinaryFunc.deleteCreateFiles(
						req.files.pictures,
						null
					);

					const fileMoveToFolder = await cloudinaryFunc.createFolder(
						newOffer._id,
						fileUploaded.public_id,
						offerFolderRootPath
					);
					newOffer.product_pictures = fileMoveToFolder;
				}
			}

			// console.log("Etape 5 : ", filMoveToFolder);

			await newOffer.save();

			await newOffer.populate("owner", "account");

			return res.status(200).json(newOffer);
		} catch (error) {
			return res.status(500).json({ message: error.message });
		}
	}
);

/**
 *  Return an array with the offers (according to the query) from the DB
 */
router.get("/offers", async (req, res) => {
	try {
		let { title, description, priceMin, priceMax, sort, page, limit } =
			req.query;
		// const limitPerPage = 5;
		const limitPerPage = limit;
		let sortFinalValue = "desc";
		const skipFinalValue = (page - 1) * limitPerPage;

		if (!priceMin || priceMin < 0 || priceMin > maxPriceOfferGlobal) {
			priceMin = 0;
		}
		if (!priceMax || priceMax > maxPriceOfferGlobal || priceMax < 0) {
			priceMax = maxPriceOfferGlobal;
		}

		// console.log(priceMin, priceMax);
		if (priceMin > priceMax) {
			let temp = priceMin;
			priceMin = priceMax;
			priceMax = temp;
			// console.log("priceMin : ", priceMin);
			// console.log("priceMax : ", priceMax);
		}
		if (!page || page > maxPageNumber) {
			page = 1;
		}
		if (sort && (sort === "price-desc" || sort === "price-asc")) {
			sortFinalValue = sort.replace("price-", "");
		}

		if (
			(title && typeof title !== "string") ||
			(description && typeof description !== "string") ||
			isNaN(priceMin) ||
			isNaN(priceMax) ||
			isNaN(page)
		) {
			return res.status(400).json({
				message: "Please use the right type of query.",
			});
		}
		const offerList = await Offer.find({
			product_name: new RegExp(title, "i"),
			product_description: new RegExp(description, "i"),
			product_price: { $gte: priceMin, $lte: priceMax },
		})
			.populate("owner", "account")
			.sort({ product_price: sortFinalValue })
			.skip(skipFinalValue)
			.limit(limitPerPage);
		// .select("product_name product_description product_price owner -_id");

		if (offerList.length <= 0) {
			return res
				.status(400)
				.json({ message: "No offer can be found with those parameters." });
		} else {
			const returnOfferList = { count: offerList.length, offers: offerList };
			// console.log(`Le find renvoie ${offerList.length} offres`);
			return res.status(200).json(returnOfferList);
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

/**
 *  Return the offers (according to the id in params) from the DB
 */
router.get("/offer/:id", async (req, res) => {
	try {
		const offerID = req.params.id;

		if (mongoose.isObjectIdOrHexString(offerID) === false) {
			return res.status(400).json({
				message: "Please use a valid Id.",
			});
		}

		const offerByID = await Offer.findById(offerID)
			.populate("owner", "account -_id")
			.select("product_name product_description product_price owner -_id");

		if (!offerByID) {
			return res
				.status(400)
				.json({ message: "No offer can be found with this Id." });
		}
		return res.status(200).json(offerByID);
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

/**
 * Modify an existing offer
 */
router.put("/offer/:id", isAuthenticated, fileUpload(), async (req, res) => {
	try {
		if (isObjectPopulate(req.body) === false && req.files === undefined) {
			return res.status(400).json({
				message:
					"Please change at least one information from your offer before validate.",
			});
		}

		const { title, description, price, condition, city, brand, size, color } =
			req.body;
		const offerID = req.params.id;

		if (mongoose.isObjectIdOrHexString(offerID) === false) {
			return res.status(400).json({
				message: "Please use a valid Id.",
			});
		}
		const offerToModify = await Offer.findOne({ _id: offerID }).populate(
			"owner"
		);

		if (!offerToModify) {
			return res.status(404).json({ message: "This offer doesn't exist." });
		} else if (offerToModify.owner.token !== req.user.token) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			if (title) {
				if (typeof title === "string" && title.length <= titleMaxStrLength) {
					offerToModify.product_name = title;
				} else {
					return res.status(400).json({
						message:
							"Please fill all the mandatory fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (description) {
				if (
					typeof description === "string" &&
					description.length <= descrMaxStrLength
				) {
					offerToModify.product_description = description;
				} else {
					return res.status(400).json({
						message:
							"Please fill all the mandatory fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (price) {
				if (!isNaN(price) && price <= maxPriceOfferGlobal) {
					offerToModify.product_price = price;
				} else {
					return res.status(400).json({
						message:
							"Please fill all the mandatory fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (brand) {
				if (typeof brand === "string" && brand.length <= titleMaxStrLength) {
					offerToModify.product_details[0] = { MARQUE: brand };
				} else {
					return res.status(400).json({
						message:
							"Please fill all the mandatory fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (size) {
				if (
					(typeof size === "string" && size.length <= titleMaxStrLength) ||
					(typeof size === "number" && size <= maxPriceOfferGlobal)
				) {
					offerToModify.product_details[1] = { TAILLE: size };
				} else {
					return res.status(400).json({
						message:
							"Please fill fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (condition) {
				if (
					typeof condition === "string" &&
					condition.length <= titleMaxStrLength
				) {
					offerToModify.product_details[2] = { ÉTAT: condition };
				} else {
					return res.status(400).json({
						message:
							"Please fill fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (color) {
				if (typeof color === "string" && color.length <= titleMaxStrLength) {
					offerToModify.product_details[3] = { COULEUR: color };
				} else {
					return res.status(400).json({
						message:
							"Please fill fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (city) {
				if (typeof city === "string" && city.length > titleMaxStrLength) {
					offerToModify.product_details[4] = { EMPLACEMENT: city };
				} else {
					return res.status(400).json({
						message:
							"Please fill fields with the right type of parameters and respecting the text limitation.",
					});
				}
			}
			if (req.files) {
				const newFile = await cloudinaryFunc.deleteCreateFiles(
					req.files.image,
					offerToModify.product_image.public_id
				);

				const fileModification = await cloudinaryFunc.createFolder(
					offerToModify._id,
					newFile.public_id,
					offerFolderRootPath
				);

				offerToModify.product_image = fileModification;
			}

			await offerToModify.save();

			return res.status(200).json(offerToModify);
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

/**
 * Delete an existing offer
 */
router.delete("/offer/:id", isAuthenticated, async (req, res) => {
	try {
		const offerID = req.params.id;

		if (mongoose.isObjectIdOrHexString(offerID) === false) {
			return res.status(400).json({
				message: "Please use a valid Id.",
			});
		}

		const offerToDelete = await Offer.findOne({ _id: offerID }).populate(
			"owner"
		);

		if (!offerToDelete) {
			return res.status(404).json({ message: "This offer doesn't exist." });
		} else if (offerToDelete.owner.token !== req.user.token) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			await cloudinaryFunc.deleteCreateFiles(
				null,
				offerToDelete.product_image.public_id
			);
			await cloudinaryFunc.deleteFolder(offerToDelete.product_image.folder);
			await offerToDelete.deleteOne();

			return res.status(200).json({
				message: `Your offer ${offerToDelete.product_name} was successfully deleted.`,
			});
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});
module.exports = router;
