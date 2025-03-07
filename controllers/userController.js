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







// Create Sub-Admin
exports.createSubAdmin = async (req, res) => {
    try {
        console.log("🟢 Create Sub-Admin Request Received:", req.body);

        const { username, password, role, range_start, range_end } = req.body;

        // ✅ Validation: Ensure all fields are provided
        if (!username || !password || !role || !range_start || !range_end) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Check if Range Overlaps with Existing Sub-Admins
        const [existingRanges] = await db.query(
            "SELECT * FROM id_ranges WHERE (range_start <= ? AND range_end >= ?) OR (range_start <= ? AND range_end >= ?) OR (range_start >= ? AND range_end <= ?)",
            [range_start, range_start, range_end, range_end, range_start, range_end]
        );

        if (existingRanges.length) {
            console.warn("⚠️ Range Conflict Detected");
            return res.status(400).json({ message: "The selected range overlaps with an existing sub-admin" });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Insert Sub-Admin into Database
        const [subAdminResult] = await db.query(
            "INSERT INTO login (username, password, role) VALUES (?, ?, ?)",
            [username, hashedPassword, role]
        );
        
        const subAdminId = subAdminResult.insertId;

        // ✅ Insert Range into Database
        await db.query(
            "INSERT INTO id_ranges (sub_admin_id, range_start, range_end, created_at) VALUES (?, ?, ?, NOW())",
            [subAdminId, range_start, range_end]
        );

        console.log("✅ Sub-Admin Created Successfully");
        res.status(201).json({
            success: true,
            message: "Sub-admin created successfully",
            subAdmin: {
                id: subAdminId,
                username,
                role,
                range: { range_start, range_end }
            }
        });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Login Sub-Admin
exports.loginSubAdmin = async (req, res) => {
    try {
        console.log("🟢 Login Request Received:", req.body);

        const { username, password } = req.body;

        // ✅ Validation: Ensure both username and password are provided
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // ✅ Fetch Sub-Admin by Username
        const [results] = await db.query("SELECT * FROM login WHERE username = ?", [username]);

        if (!results.length) {
            console.warn("⚠️ Sub-Admin not found");
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const subAdmin = results[0];

        // ✅ Verify Password
        const passwordMatch = await bcrypt.compare(password, subAdmin.password);

        if (!passwordMatch) {
            console.warn("⚠️ Incorrect password");
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // ✅ Fetch Range Details
        const [rangeResults] = await db.query("SELECT range_start, range_end FROM id_ranges WHERE sub_admin_id = ?", [subAdmin.id]);
        const range = rangeResults.length ? rangeResults[0] : { range_start: null, range_end: null };

        console.log("✅ Sub-Admin logged in successfully!");
        res.status(200).json({
            success: true,
            message: "Login successful",
            subAdmin: {
                id: subAdmin.id,
                username: subAdmin.username,
                role: subAdmin.role,
                range: {
                    range_start: range.range_start,
                    range_end: range.range_end
                }
            }
        });

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmNewPassword } = req.body;
      const { userId } = req.params;
  console.log("pass",currentPassword, newPassword, confirmNewPassword)
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ message: "All fields are required" });
      }
  
      if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: "New passwords do not match" });
      }
  
      // Get user details
      const [user] = await db.query("SELECT password FROM Users WHERE id = ?", [userId]);
  
      if (user.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
  
      const isMatch = await bcrypt.compare(currentPassword, user[0].password);
      if (!isMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
  
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      // Update password
      await db.query("UPDATE Users SET password = ? WHERE id = ?", [hashedPassword, userId]);
  
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  };


  exports.getCombinedData = async (req, res) => {
    try {
        console.log("🟢 Fetching Combined Data for User ID:", req.params.pid);

        const [results] = await db.query(
            `SELECT 
                a.id AS adv_id, a.pub_name, a.campaign_name AS adv_campaign, a.geo AS adv_geo, a.city AS adv_city, 
                a.os AS adv_os, a.payable_event AS adv_payable_event, a.mmp_tracker AS adv_mmp_tracker, 
                a.adv_id, a.adv_payout, a.pub_am, a.pub_id AS adv_pub_id, a.pid AS adv_pid, a.shared_date AS adv_shared_date, 
                a.paused_date AS adv_paused_date, a.adv_total_no, a.adv_deductions, a.adv_approved_no, a.user_id AS adv_user_id,

                p.id AS pub_id, p.adv_name, p.campaign_name AS pub_campaign, p.geo AS pub_geo, p.city AS pub_city, 
                p.os AS pub_os, p.payable_event AS pub_payable_event, p.mmp_tracker AS pub_mmp_tracker, 
                p.pub_id AS pub_pub_id, p.p_id AS pub_p_id, p.pub_payout, p.shared_date AS pub_shared_date, 
                p.paused_date AS pub_paused_date, p.review, p.pub_total_numbers, p.pub_deductions, p.pub_approved_numbers, 
                p.user_id AS pub_user_id
            FROM adv_data a
            LEFT JOIN pub_data p ON a.pid = p.p_id
            WHERE a.pid = ? OR p.p_id = ?`,
            [req.params.pid, req.params.pid]
        );

        if (results.length === 0) {
            console.warn("⚠️ No Data Found for User ID:", req.params.pid);
            return res.status(404).json({ message: "No data found for this user" });
        }

        console.log("✅ Combined Data Retrieved Successfully");
        res.status(200).json(results);

    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error", details: error.message });
    }
};



exports.getUserData = async (req, res) => {
    const userId = req.params.userId;
console.log("id",userId)
    try {
        // Fetch role from login table
        const [results] = await db.query("SELECT id, role FROM login WHERE id = ?", [userId]);

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const { id, role } = results[0];

        // Decide table based on role
        let query;
        if (role === "advertiser") {
            query = "SELECT * FROM adv_data WHERE user_id = ?";
        } else if (role === "publisher") {
            query = "SELECT * FROM pub_data WHERE user_id = ?";
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }

        // Fetch user data from the selected table
        const [userData] = await db.query(query, [userId]);

        return res.json({ role, data: userData });

    } catch (err) {
        console.error("Error fetching user data:", err);
        return res.status(500).json({ error: "Database error" });
    }
};
