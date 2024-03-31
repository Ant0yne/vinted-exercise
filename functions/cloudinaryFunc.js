"use strict";

const cloudinary = require("cloudinary").v2;

cloudinary.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.API_KEY,
	api_secret: process.env.API_SECRET,
});

// Image buffer to base 64 for Cloudinary
const convertToBase64 = (file) => {
	return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

/**
 *
 * @param {object} fileToUpload
 * @param {string} fileToDeleteID
 *
 * @returns object with the data from Cloudinary regarding the file
 */
const deleteCreateFiles = async (fileToUpload, fileToDeleteID) => {
	try {
		// Delete the previous file if there is
		if (fileToDeleteID) {
			await cloudinary.uploader.destroy(fileToDeleteID);
		}

		// Uplaod the new file if there is
		if (fileToUpload) {
			const result = await cloudinary.uploader.upload(
				convertToBase64(fileToUpload)
			);
			return result;
		}
	} catch (error) {
		return res.status(500).json({ message: "Error during the file upload." });
	}
};

// Check if there is at least an image when creating an offer
const middlewareFileCheck = async (req, res, next) => {
	try {
		if (req.files) {
			return next();
		} else {
			return res
				.status(400)
				.json({ message: "Please upload a picture of your item." });
		}
	} catch (error) {
		return res.status(500).json({ message: "Error during the file upload." });
	}
};

/**
 *
 * @param {String} Id
 * @param {String} filePublicId
 * @param {String} folderRootPath
 *
 * @returns the image Object with the new name and path
 */
const createFolder = async (Id, filePublicId, folderRootPath) => {
	try {
		// Retreive the folders in Cloudinary at the defined path
		const folderList = await cloudinary.api.sub_folders(folderRootPath);
		// Create the new image path and name
		const newFilePublicId = `${folderRootPath}/${Id}/${filePublicId}`;

		// Check if a folder already exist
		let folderExist = false;
		for (const folder of folderList.folders) {
			if (folder.name === Id) {
				folderExist = true;
			}
		}

		// Create the folder if it doesn't exist
		if (!folderExist) {
			await cloudinary.api.create_folder(`${folderRootPath}/${Id}`);
		}

		// Move and rename the file
		const result = await cloudinary.uploader.rename(
			filePublicId,
			newFilePublicId
		);

		return result;
	} catch (error) {
		console.error(error.message);
	}
};

// Delete the emptu folder in Cloudinary
const deleteFolder = async (folderPath) => {
	await cloudinary.api.delete_folder(folderPath);
};

module.exports = {
	deleteCreateFiles,
	middlewareFileCheck,
	createFolder,
	deleteFolder,
};
