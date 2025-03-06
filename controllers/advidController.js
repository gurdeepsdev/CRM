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

        const { adv_name, adv_id, user_id } = req.body;

        // ✅ Validation: Ensure all fields are provided
        if (!adv_name || !adv_id || !user_id) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Insert Advertisement into Database
        await db.query(
            "INSERT INTO advids (adv_name, adv_id, user_id) VALUES (?, ?, ?)",
            [adv_name, adv_id, user_id]
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
