const db = require('../db/Connection');
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
require('dotenv').config();
const multer = require("multer");
const path = require("path");

const cron = require('node-cron');
const axios = require('axios');
const { transactionUtils } = require("../routes/transactionUtils"); // Import function

// const { sendNotification } = require("../socket"); // Import the function from socket.js


// Secret key for J
// WT (store this securely, e.g., in environment variables)
const JWT_SECRET = process.env.VITE_API_JWT_SECRET;

console.log("JWT_SECRET",JWT_SECRET)
// const JWT_SECRET = 'gurdeep0111';
dotenv.config();





// Create Advertisement by Sub-Admin
exports.createAdvertisement = async (req, res) => {
    try {
        console.log("🟢 Create Advertisement Request Received:", req.body);

        const { adv_name, adv_id, user_id, geo, note } = req.body;

        // ✅ Validation: Ensure all fields are provided
        if (!adv_name || !adv_id || !user_id || !geo) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Insert Advertisement into Database
        await db.query(
            "INSERT INTO advids (adv_name, adv_id, user_id, geo, note) VALUES (?, ?, ?, ?, ?)",
            [adv_name, adv_id, user_id, geo, note]
        );

        console.log("✅ Advertisement Created Successfully");
        res.status(201).json({ success: true, message: "Advertisement created successfully" });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Advertisements by User ID
exports.getAdvertisementsByUserId = async (req, res) => {
    try {
        console.log("🟢 Get Advertisements Request Received:", req.params);

        const { user_id } = req.params;

        // ✅ Validation: Ensure user_id is provided
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // ✅ Fetch Advertisements
        const [ads] = await db.query("SELECT * FROM advids WHERE user_id = ?", [user_id]);

        console.log("✅ Advertisements Retrieved Successfully");

        if (ads.length > 0) {
            console.log("✅ Advertisements Found");
            res.status(200).json({ success: true, advertisements: ads });

            // return res.status(200).json(true);
        } else {
            console.log("⚠️ No Advertisements Found");
            return res.status(200).json({ success: false});
        }
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Get all advertisers with username from login table
exports.getAllAdvertisers = async (req, res) => {
    try {
        console.log("🟢 Fetching all advertisers...");

        // ✅ Fetch all data from advids table and join with login table to get username
        const [advertisers] = await db.query(`
            SELECT a.*, l.username 
            FROM advids a
            LEFT JOIN login l ON a.user_id = l.id
        `);

        // ✅ Check if data exists
        if (advertisers.length === 0) {
            return res.status(404).json({ success: false, message: "No advertisers found." });
        }

        console.log("✅ Advertisers retrieved successfully.");
        res.status(200).json({ success: true, data: advertisers });

    } catch (error) {
        console.error("❌ Error fetching advertisers:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


// Update Advertisement update
exports.updateAdvertisement = async (req, res) => {
    try {
        console.log("🟡 Update Advertisement Request Received:", req.body);

        const { adv_name, adv_id, user_id, geo, note } = req.body;

        // ✅ Validation: Ensure all fields are provided
        if (!adv_id || !user_id) {
            return res.status(400).json({ success: false, message: "adv_id and user_id are required" });
        }

        // ✅ Check if advertisement exists
        const [existingAdvertisement] = await db.query("SELECT * FROM advids WHERE adv_id = ? AND user_id = ?", [adv_id, user_id]);
        
        if (!existingAdvertisement.length) {
            return res.status(404).json({ success: false, message: "Advertisement not found" });
        }

        // ✅ Update Advertisement in Database
        await db.query(
            "UPDATE advids SET adv_name = ?, geo = ?, note = ? WHERE adv_id = ? AND user_id = ?",
            [adv_name, geo, note, adv_id, user_id]
        );

        console.log("✅ Advertisement Updated Successfully");
        res.status(200).json({ success: true, message: "Advertisement updated successfully" });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// Update Pause Status for a Publisher
exports.updateAdvPause = async (req, res) => {
    try {
        console.log("🟠 Update Pause Request Received:", req.body);

        const { adv_id, pause } = req.body;

        // ✅ Validate request body
        if (!adv_id || typeof pause === 'undefined') {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: 'adv_id' and 'pause' are mandatory.",
            });
        }

        // ✅ Validate pause value
        if (![0, 1].includes(Number(pause))) {
            return res.status(422).json({
                success: false,
                message: "Invalid 'pause' value. Allowed values are 0 or 1.",
            });
        }

        // ✅ Update the pause field in the database
        const [result] = await db.query("UPDATE advids SET pause = ? WHERE adv_id = ?", [pause, adv_id]);

        if (result.affectedRows === 0) {
            // ⚠️ pub_id does not exist
            return res.status(404).json({
                success: false,
                message: `advids with pub_id '${adv_id}' not found.`,
            });
        }

        // ✅ Update successful
        console.log("✅ Pause Field Updated Successfully for adv_id:", adv_id);
        return res.status(200).json({
            success: true,
            message: "Pause status updated successfully.",
        });

    } catch (error) {
        // ❌ Unexpected error
        console.error("❌ Internal Server Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again later.",
            error: error.message,
        });
    }
};