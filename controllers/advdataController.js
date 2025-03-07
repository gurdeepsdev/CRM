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



// // Add new data
// exports.addAdvData = async (req, res) => {
//     try {
//         const data = req.body;
//         const sql = `INSERT INTO adv_data SET ?`;

//         db.query(sql, data, (err, result) => {
//             if (err) {
//                 console.error("Error inserting data:", err);
//                 return res.status(500).json({ error: "Database error", details: err.sqlMessage });
//             }
//             res.status(201).json({ message: "Data added successfully", id: result.insertId });
//         });
//     } catch (error) {
//         console.error("Server error:", error);
//         res.status(500).json({ error: "Server error", details: error.message });
//     }
// };

// Add new data
exports.addAdvData = async (req, res) => {
    try {
        console.log("🟢 Add Adv Data Request Received:", req.body);

        const { 
            pub_name, campaign_name, geo, city, os, payable_event, 
            mmp_tracker, adv_id, adv_payout, pub_am, pub_id, pid, 
            shared_date, paused_date, adv_total_no, adv_deductions, adv_approved_no 
        } = req.body;

        // ✅ Insert Data into Database
        const [result] = await db.query(
            `INSERT INTO adv_data 
            (pub_name, campaign_name, geo, city, os, payable_event, 
            mmp_tracker, adv_id, adv_payout, pub_am, pub_id, pid, 
            shared_date, paused_date, adv_total_no, adv_deductions, adv_approved_no) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                pub_name, campaign_name, geo, city, os, payable_event, 
                mmp_tracker, adv_id, adv_payout, pub_am, pub_id, pid, 
                shared_date, paused_date, adv_total_no, adv_deductions, adv_approved_no
            ]
        );

        console.log("✅ Data Added Successfully");
        res.status(201).json({ 
            success: true, 
            message: "Data added successfully", 
            id: result.insertId 
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};


// ✅ Get all pub_data
exports.getAllAdvData = async (req, res) => {
    try {
        console.log("🟢 Fetching All Pub Data");

        const [results] = await db.query(`SELECT * FROM adv_data`);

        console.log("✅ Data Retrieved Successfully");
        res.status(200).json(results);
        
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};

// Get data by ID
// ✅ Get single pub_data by ID
exports.getAdvDataById = async (req, res) => {
    try {
        console.log("🟢 Fetching Pub Data for User ID:", req.params.id);

        const [results] = await db.query(`SELECT * FROM adv_data WHERE user_id = ?`, [req.params.id]);

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

// ✅ update adv_data by ID
exports.updateAdvData = async (req, res) => {
    try {
        console.log("🟢 Updating Adv Data:", req.params.id, req.body);

        const { 
            pub_name, campaign_name, geo, city, os, payable_event, mmp_tracker, 
            adv_id, adv_payout, pub_am, pub_id, pid, shared_date, paused_date, 
            adv_total_no, adv_deductions, adv_approved_no, user_id 
        } = req.body;

        const [result] = await db.query(
            `UPDATE adv_data SET 
            pub_name = ?, campaign_name = ?, geo = ?, city = ?, os = ?, 
            payable_event = ?, mmp_tracker = ?, adv_id = ?, adv_payout = ?, pub_am = ?, 
            pub_id = ?, pid = ?, shared_date = ?, paused_date = ?, 
            adv_total_no = ?, adv_deductions = ?, adv_approved_no = ?, user_id = ?
            WHERE id = ?`,
            [
                pub_name, campaign_name, geo, city, os, payable_event, mmp_tracker, 
                adv_id, adv_payout, pub_am, pub_id, pid, shared_date, paused_date, 
                adv_total_no, adv_deductions, adv_approved_no, user_id, req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            console.warn("⚠️ No Data Found to Update for ID:", req.params.id);
            return res.status(404).json({ message: "Adv data not found" });
        }

        console.log("✅ Adv Data Updated Successfully");
        res.status(200).json({ success: true, message: "Adv data updated successfully" });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};
