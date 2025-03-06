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




// ✅ Add new pub_data entry
exports.addPubData = async (req, res) => {
    try {
        console.log("🟢 Add Pub Data Request Received:", req.body);

        const { 
            adv_name, campaign_name, geo, city, os, payable_event, 
            mmp_tracker, pub_id, p_id, pub_payout, shared_date, paused_date, 
            review, pub_total_numbers, pub_deductions, pub_approved_numbers 
        } = req.body;

        // ✅ Insert Data into Database
        const [result] = await db.query(
            `INSERT INTO pub_data 
            (adv_name, campaign_name, geo, city, os, payable_event, 
            mmp_tracker, pub_id, p_id, pub_payout, shared_date, paused_date, 
            review, pub_total_numbers, pub_deductions, pub_approved_numbers) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                adv_name, campaign_name, geo, city, os, payable_event, 
                mmp_tracker, pub_id, p_id, pub_payout, shared_date, paused_date, 
                review, pub_total_numbers, pub_deductions, pub_approved_numbers
            ]
        );

        console.log("✅ Pub Data Added Successfully");
        res.status(201).json({ 
            success: true, 
            message: "Pub data added successfully", 
            id: result.insertId 
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};

// ✅ Get all pub_data
exports.getAllPubData = async (req, res) => {
    try {
        console.log("🟢 Fetching All Pub Data");

        const [results] = await db.query(`SELECT * FROM pub_data`);

        console.log("✅ Data Retrieved Successfully");
        res.status(200).json(results);
        
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};

exports.getPubDataByUserId = async (req, res) => {
    try {
        console.log("🟢 Fetching Pub Data for User ID:", req.params.id);

        const [results] = await db.query(`SELECT * FROM pub_data WHERE user_id = ?`, [req.params.id]);

        if (results.length === 0) {
            console.warn("⚠️ No Pub Data Found for User ID:", req.params.id);
            return res.status(404).json({ message: "No pub data found for this user" });
        }

        console.log(`✅ Retrieved ${results.length} records for User ID:`, req.params.id);
        res.status(200).json(results);

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};


// ✅ Update pub_data by ID
exports.updatePubData = async (req, res) => {
    try {
        console.log("🟢 Updating Pub Data:", req.params.id, req.body);

        const { 
            adv_name, campaign_name, geo, city, os, payable_event, 
            mmp_tracker, pub_id, p_id, pub_payout, shared_date, paused_date, 
            review, pub_total_numbers, pub_deductions, pub_approved_numbers 
        } = req.body;

        const [result] = await db.query(
            `UPDATE pub_data SET 
            adv_name = ?, campaign_name = ?, geo = ?, city = ?, os = ?, 
            payable_event = ?, mmp_tracker = ?, pub_id = ?, p_id = ?, pub_payout = ?, 
            shared_date = ?, paused_date = ?, review = ?, pub_total_numbers = ?, 
            pub_deductions = ?, pub_approved_numbers = ? 
            WHERE id = ?`,
            [
                adv_name, campaign_name, geo, city, os, payable_event, 
                mmp_tracker, pub_id, p_id, pub_payout, shared_date, paused_date, 
                review, pub_total_numbers, pub_deductions, pub_approved_numbers, req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            console.warn("⚠️ No Data Found to Update");
            return res.status(404).json({ message: "Pub data not found" });
        }

        console.log("✅ Pub Data Updated Successfully");
        res.status(200).json({ success: true, message: "Pub data updated successfully" });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};

// ✅ Delete pub_data by ID
exports.deletePubData = async (req, res) => {
    try {
        console.log("🟢 Deleting Pub Data:", req.params.id);

        const [result] = await db.query(`DELETE FROM pub_data WHERE id = ?`, [req.params.id]);

        if (result.affectedRows === 0) {
            console.warn("⚠️ No Data Found to Delete");
            return res.status(404).json({ message: "Pub data not found" });
        }

        console.log("✅ Pub Data Deleted Successfully");
        res.status(200).json({ success: true, message: "Pub data deleted successfully" });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};