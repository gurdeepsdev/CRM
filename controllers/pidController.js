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






// Create  reviews Entry
exports.createPid = async (req, res) => {
    try {
        const { user_id, pid } = req.body;

        if (!user_id || !pid) {
            return res.status(400).json({ message: "User ID and PID are required" });
        }

        await db.query(
            "INSERT INTO allpids (user_id, pid, created_at) VALUES (?, ?, NOW())",
            [user_id, pid]
        );

        res.status(201).json({ success: true, message: "pid entry created successfully" });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Get reviews Entries by User ID
exports.getPids = async (req, res) => {
    try {
        // const { user_id } = req.params;

        // if (!user_id) {
        //     return res.status(400).json({ message: "User ID is required" });
        // }

        const [entries] = await db.query("SELECT * FROM allpids");

        res.status(200).json({ success: true, data: entries });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Edit reviews Entry
exports.editPid = async (req, res) => {
    try {
        const { id } = req.params;
        const { pid } = req.body;

        if (!id || !pid) {
            return res.status(400).json({ message: "ID and pid text are required" });
        }

        await db.query(
            "UPDATE allpids SET pid = ? WHERE id = ?",
            [pid, id]
        );

        res.status(200).json({ success: true, message: "pid text entry updated successfully" });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
// Get all publishers
exports.getAllPublishers = async (req, res) => {
    try {
        console.log("🟢 Fetching all publishers...");

        // ✅ Fetch all data from publids table
        const [publishers] = await db.query("SELECT * FROM publids");

        // ✅ Check if data exists
        if (publishers.length === 0) {
            return res.status(404).json({ success: false, message: "No publishers found." });
        }

        console.log("✅ Publishers retrieved successfully.");
        res.status(200).json({ success: true, data: publishers });

    } catch (error) {
        console.error("❌ Error fetching publishers:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// Get all publishers with username from login table
exports.getNamePublishers = async (req, res) => {
    try {
        console.log("🟢 Fetching all publishers...");

        // ✅ Fetch all data from publids table and join with login table to get username
        const [publishers] = await db.query(`
            SELECT p.*, l.username 
            FROM publids p
            LEFT JOIN login l ON p.user_id = l.id
        `);

        // ✅ Check if data exists
        if (publishers.length === 0) {
            return res.status(404).json({ success: false, message: "No publishers found." });
        }

        console.log("✅ Publishers retrieved successfully.");
        res.status(200).json({ success: true, data: publishers });

    } catch (error) {
        console.error("❌ Error fetching publishers:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
