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
exports.createPublisher = async (req, res) => {
    try {
        console.log("🟢 Create Publisher Request Received:", req.body);

        const { pub_name, pub_id, user_id, geo, note } = req.body;

        // ✅ Validation: Ensure all fields are provided
        if (!pub_name || !pub_id || !user_id || !geo) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Insert Advertisement into Database
        await db.query(
            "INSERT INTO publids (pub_name, pub_id, user_id, geo, note) VALUES (?, ?, ?, ?, ?)",
            [pub_name, pub_id, user_id, geo, note]
        );

        console.log("✅ Publisher Created Successfully");
        res.status(201).json({ success: true, message: "Publisher created successfully" });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get Advertisements by User ID
exports.getPublisherByUserId = async (req, res) => {
    try {
        console.log("🟢 Get Publisher Request Received:", req.params);

        const { user_id } = req.params;

        // ✅ Validation: Ensure user_id is provided
        if (!user_id) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // ✅ Fetch Advertisements
        const [ads] = await db.query("SELECT * FROM publids WHERE user_id = ?", [user_id]);

        console.log("✅ Publisher Retrieved Successfully");

        if (ads.length > 0) {
            console.log("✅ Publisher Found");
            res.status(200).json({ success: true, Publisher: ads });

            // return res.status(200).json(true);
        } else {
            console.log("⚠️ No Publisher Found");
            return res.status(200).json({ success: false});
        }
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update Advertisement update
exports.updatePublisher = async (req, res) => {
    try {
        console.log("🟡 Update Publisher Request Received:", req.body);

        const { pub_name, pub_id, user_id, geo, note } = req.body;

        // ✅ Validation: Ensure all fields are provided
        if (!pub_id || !user_id) {
            return res.status(400).json({ success: false, message: "pub_id and user_id are required" });
        }

        // ✅ Check if publisher exists
        const [existingPublisher] = await db.query("SELECT * FROM publids WHERE pub_id = ? AND user_id = ?", [pub_id, user_id]);
        
        if (!existingPublisher.length) {
            return res.status(404).json({ success: false, message: "Publisher not found" });
        }

        // ✅ Update Advertisement in Database
        await db.query(
            "UPDATE publids SET pub_name = ?, geo = ?, note = ? WHERE pub_id = ? AND user_id = ?",
            [pub_name, geo, note, pub_id, user_id]
        );

        console.log("✅ Publisher Updated Successfully");
        res.status(200).json({ success: true, message: "Publisher updated successfully" });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// Update Pause Status for a Publisher
exports.updatePublisherPause = async (req, res) => {
    try {
        console.log("🟠 Update Pause Request Received:", req.body);

        const { pub_id, pause } = req.body;

        // ✅ Validate request body
        if (!pub_id || typeof pause === 'undefined') {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: 'pub_id' and 'pause' are mandatory.",
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
        const [result] = await db.query("UPDATE publids SET pause = ? WHERE pub_id = ?", [pause, pub_id]);

        if (result.affectedRows === 0) {
            // ⚠️ pub_id does not exist
            return res.status(404).json({
                success: false,
                message: `Publisher with pub_id '${pub_id}' not found.`,
            });
        }

        // ✅ Update successful
        console.log("✅ Pause Field Updated Successfully for pub_id:", pub_id);
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
