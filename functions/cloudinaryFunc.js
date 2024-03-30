"use strict";

const cloudinary = require("cloudinary").v2;

cloudinary.config({
	cloud_name: process.env.CLOUD_NAME,
	api_key: process.env.API_KEY,
	api_secret: process.env.API_SECRET,
});

const convertToBase64 = (file) => {
	return `data:${file.mimetype};base64,${file.data.toString("base64")}`;
};

/**
 *
 * @param {object} fileToUpload
 * @param {string} fileToDeleteID
 * @returns object with the data from Cloudinary regarding the file
 */
const deleteCreateFiles = async (fileToUpload, fileToDeleteID) => {
	try {
		if (fileToDeleteID) {
			await cloudinary.uploader.destroy(fileToDeleteID);
		}

		if (fileToUpload) {
			const result = await cloudinary.uploader.upload(
				convertToBase64(fileToUpload)
			);
			// console.log("Etape 2 : ", result);
			return result;
		}
	} catch (error) {
		return res.status(500).json({ message: "Error during the file upload." });
	}
};

const middlewareFileCheck = async (req, res, next) => {
	try {
		if (req.files) {
			// console.log("Etape 1 : ", req.files.picture);
			// req.fileUploaded = await deleteCreateFiles(req.files.picture, null);
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

const createFolder = async (Id, filePublicId, folderRootPath) => {
	try {
		const folderList = await cloudinary.api.sub_folders(folderRootPath);
		const newFilePublicId = `${folderRootPath}/${Id}/${filePublicId}`;
		let folderExist = false;

		for (const folder of folderList.folders) {
			if (folder.name === Id) {
				folderExist = true;
			}
		}

		if (!folderExist) {
			await cloudinary.api.create_folder(`${folderRootPath}/${Id}`);
		}

		const result = await cloudinary.uploader.rename(
			filePublicId,
			newFilePublicId
		);

		return result;
	} catch (error) {
		console.error(error.message);
	}
};

const deleteFolder = async (folderPath) => {
	await cloudinary.api.delete_folder(folderPath);
};

module.exports = {
	deleteCreateFiles,
	middlewareFileCheck,
	createFolder,
	deleteFolder,
};
