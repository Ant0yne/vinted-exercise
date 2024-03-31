"use strict";

const express = require("express");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");

// MODELS
const User = require("../models/User");
const Offer = require("../models/Offer");

// check user's token to authenticate them
const isAuthenticated = require("../middlewares/isAuthenticated");
// Manage all image uploading, deleting, ...
const cloudinaryFunc = require("../functions/cloudinaryFunc");
// Check if an Object is empty
const isObjectPopulate = require("../functions/isObjectPopulate");

const router = express.Router();

// Max price range for offers
const maxPriceOfferGlobal = 100000;
// Max page displayed
const maxPageNumber = 1000;
// Max length for title (same for details) and description
const titleMaxStrLength = 50;
const descrMaxStrLength = 500;
// The path to move the image for this project on Cloudinary
const offerFolderRootPath = "vinted/offers";

// Create an offer -----------------------------------------------------------------------------------------
router.post(
	"/offer/publish",
	isAuthenticated,
	fileUpload(),
	// Check if there is the image key, else error
	cloudinaryFunc.middlewareFileCheck,
	async (req, res) => {
		try {
			let { title, description, price, condition, city, brand, size, color } =
				req.body;

			// Conditions of errors
			// Missing body parameters
			// Wrong type
			// Above all the max variables define on top of route
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

			// Default value for none required paramaters
			// Then create an Array of Object with it
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

			// Upload the image to Cloudinary then return the result object
			const fileUploaded = await cloudinaryFunc.deleteCreateFiles(
				req.files.image,
				null
			);

			// Create the offer in DDB
			const newOffer = new Offer({
				product_name: title,
				product_description: description,
				product_price: price,
				product_details: detailsBody,
				product_image: fileUploaded,
				owner: req.user,
			});

			// Move the image to the a folder with the offer's ID name
			const filMoveToFolder = await cloudinaryFunc.createFolder(
				newOffer._id,
				newOffer.product_image.public_id,
				offerFolderRootPath
			);

			// Replace the image in offer with the one moved
			newOffer.product_image = filMoveToFolder;

			// Check if there is additional pictures sent for the offer
			if (req.files.pictures) {
				// If there is more than one (Array of picture)
				if (Array.isArray(req.files.pictures)) {
					const arrayPictures = [...req.files.pictures];

					// Upload the pictures to Cloudinary then return the result Objects
					const picturesFilesPromises = arrayPictures.map((picture) => {
						return cloudinaryFunc.deleteCreateFiles(picture, null);
					});
					const picturesToFile = await Promise.all(picturesFilesPromises);

					// Move them to the the folder with the offer's ID name
					const picturesFolderPromises = picturesToFile.map((picture) => {
						return cloudinaryFunc.createFolder(
							newOffer._id,
							picture.public_id,
							offerFolderRootPath
						);
					});
					const picturesToUpload = await Promise.all(picturesFolderPromises);

					// Add them to offer created in DDB
					newOffer.product_pictures = picturesToUpload;
				} else {
					// Same process but if there is only one picture
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

			await newOffer.save();
			await newOffer.populate("owner", "account");

			return res.status(200).json(newOffer);
		} catch (error) {
			return res.status(500).json({ message: error.message });
		}
	}
);

// Offers displayed according to query --------------------------------------------------------------------------
router.get("/offers", async (req, res) => {
	try {
		// All the potential query received
		let { title, description, priceMin, priceMax, sort, page, limit } =
			req.query;
		// Sort by default
		let sortFinalValue = "desc";
		// what offers are displayed according to the limit and the page
		const skipFinalValue = (page - 1) * limit;

		// Set the default price range : 0 to maxPriceOfferGlobal
		if (!priceMin || priceMin < 0 || priceMin > maxPriceOfferGlobal) {
			priceMin = 0;
		}
		if (!priceMax || priceMax > maxPriceOfferGlobal || priceMax < 0) {
			priceMax = maxPriceOfferGlobal;
		}

		// invert the price range value if the minimum value sent is greater that the maximum value
		if (priceMin > priceMax) {
			let temp = priceMin;
			priceMin = priceMax;
			priceMax = temp;
		}

		// If no page are query or if it is above the maxPageNumber, display the first page
		if (!page || page > maxPageNumber) {
			page = 1;
		}

		// Replace the sort by default if query and valid
		if (sort && (sort === "price-desc" || sort === "price-asc")) {
			sortFinalValue = sort.replace("price-", "");
		}

		// Conditions of errors
		// if wrong type of query
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

		// Search in DDB all offers regarding the query
		const offerList = await Offer.find({
			product_name: new RegExp(title, "i"),
			product_description: new RegExp(description, "i"),
			product_price: { $gte: priceMin, $lte: priceMax },
		})
			.populate("owner", "account")
			.sort({ product_price: sortFinalValue })
			.skip(skipFinalValue)
			.limit(limit);

		// If no offer found
		if (offerList.length <= 0) {
			return res
				.status(400)
				.json({ message: "No offer can be found with those parameters." });
		} else {
			const returnOfferList = { count: offerList.length, offers: offerList };
			return res.status(200).json(returnOfferList);
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

// Display an offer according to the id in params -------------------------------------------------------------------
router.get("/offer/:id", async (req, res) => {
	try {
		const offerID = req.params.id;

		// Check if the ID format is valid
		if (mongoose.isObjectIdOrHexString(offerID) === false) {
			return res.status(400).json({
				message: "Please use a valid Id.",
			});
		}

		// Search for an offer with this ID
		const offerByID = await Offer.findById(offerID).populate(
			"owner",
			"account -_id"
		);

		// Return error if no offer found
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

// Modify an existing offer ------------------------------------------------------------------------------------------------
router.put("/offer/:id", isAuthenticated, fileUpload(), async (req, res) => {
	try {
		// Check if there is at least one modification
		if (isObjectPopulate(req.body) === false && req.files === undefined) {
			return res.status(400).json({
				message:
					"Please change at least one information from your offer before validate.",
			});
		}

		// The body and params parameters
		const { title, description, price, condition, city, brand, size, color } =
			req.body;
		const offerID = req.params.id;

		// Check if the ID format is valid
		if (mongoose.isObjectIdOrHexString(offerID) === false) {
			return res.status(400).json({
				message: "Please use a valid Id.",
			});
		}

		// Search for an offer with this ID
		const offerToModify = await Offer.findOne({ _id: offerID }).populate(
			"owner"
		);

		// If ther is none -> error
		if (!offerToModify) {
			return res.status(404).json({ message: "This offer doesn't exist." });
			// If the user's token is not linked to this offer -> error
		} else if (offerToModify.owner.token !== req.user.token) {
			return res.status(401).json({ error: "Unauthorized to do this action." });
		} else {
			// Check if the title modif is right type and length and update it
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

			// Check if the description modif is right type and length and update it
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

			// Check if the price modif is right type and max value and update it
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

			// Check if the details modif are right type and length and update them
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

			// Check if there is image or pictures key and update them in cloudinary and in the DDB
			if (req.files) {
				if (req.files.image) {
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
				if (req.files.pictures) {
					// If there is more than one pictures (Array of picture)
					if (Array.isArray(req.files.pictures)) {
						const arrayPictures = [...req.files.pictures];

						// Delete the previous pictures and upload the new ones to Cloudinary then return the result Objects
						const picturesFilesPromises = arrayPictures.map((picture) => {
							return cloudinaryFunc.deleteCreateFiles(
								picture,
								offerToModify.product_pictures.public_id
							);
						});
						const picturesToFile = await Promise.all(picturesFilesPromises);

						// Move them to the the folder with the offer's ID name
						const picturesFolderPromises = picturesToFile.map((picture) => {
							return cloudinaryFunc.createFolder(
								offerToModify._id,
								picture.public_id,
								offerFolderRootPath
							);
						});
						const picturesToUpload = await Promise.all(picturesFolderPromises);

						// Add them to offer created in DDB
						offerToModify.product_pictures = picturesToUpload;
					} else {
						// Same process but if there is only one picture
						const newFile = await cloudinaryFunc.deleteCreateFiles(
							req.files.pictures,
							offerToModify.product_pictures.public_id
						);

						const fileModification = await cloudinaryFunc.createFolder(
							offerToModify._id,
							newFile.public_id,
							offerFolderRootPath
						);

						offerToModify.product_pictures = fileModification;
					}
				}
			}

			await offerToModify.save();
			return res.status(200).json(offerToModify);
		}
	} catch (error) {
		return res.status(500).json({ message: error.message });
	}
});

// Deleting an offer ------------------------------------------------------------------------------------------------
router.delete("/offer/:id", isAuthenticated, async (req, res) => {
	try {
		const offerID = req.params.id;

		// Check if the ID format is valid
		if (mongoose.isObjectIdOrHexString(offerID) === false) {
			return res.status(400).json({
				message: "Please use a valid Id.",
			});
		}

		// Search for the offer in DDB
		const offerToDelete = await Offer.findOne({ _id: offerID }).populate(
			"owner"
		);

		// If the offer doesn't exist -> error
		if (!offerToDelete) {
			return res.status(404).json({ message: "This offer doesn't exist." });
			// If the user's token is not linked to this offer -> error
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
