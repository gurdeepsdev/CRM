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
    const connection = await db.getConnection();
    try {
        const { username, password, role, ranges, assigned_subadmins } = req.body;

        console.log("🟢 Create Sub-Admin Request:", req.body);

        if (!username || !password || !role || !Array.isArray(ranges) || ranges.length === 0) {
            return res.status(400).json({ message: "All fields are required" });
        }

        await connection.beginTransaction();

        let finalMiniRanges = [];

        for (const range of ranges) {
            const { start, end } = range;
            console.log(`🔍 Checking range (${start}-${end})`);

            const pausedIds = [];

            for (let i = parseInt(start); i <= parseInt(end); i++) {
                console.log(`➡️ Checking ID: ${i}`);

                // Check in advids
                const [advCheck] = await connection.query("SELECT pause FROM advids WHERE adv_id = ?", [i]);
                const isAdvPaused = advCheck.length > 0 && advCheck[0].pause == 1;
                console.log(`   advids => Found: ${advCheck.length > 0}, Paused: ${isAdvPaused}`);

                // Check in publids
                const [pubCheck] = await connection.query("SELECT pause FROM publids WHERE pub_id = ?", [i]);
                const isPubPaused = pubCheck.length > 0 && pubCheck[0].pause == 1;
                console.log(`   publids => Found: ${pubCheck.length > 0}, Paused: ${isPubPaused}`);

                // Check in id_ranges
                const [idRangeCheck] = await connection.query("SELECT * FROM id_ranges WHERE ? BETWEEN range_start AND range_end", [i]);
                const isAssignedInIdRanges = idRangeCheck.length > 0;
                console.log(`   id_ranges => Assigned: ${isAssignedInIdRanges}`);

                const existsInAdv = advCheck.length > 0;
                const existsInPub = pubCheck.length > 0;
                const existsAnywhere = existsInAdv || existsInPub || isAssignedInIdRanges;

                if ((isAdvPaused || isPubPaused) || !existsAnywhere) {
                    pausedIds.push(i);
                    console.log(`✅ ID ${i} is AVAILABLE`);
                } else {
                    console.log(`❌ ID ${i} is NOT available`);
                }
            }

            if (pausedIds.length === 0) {
                console.warn(`⚠️ No available IDs found in range (${start}-${end})`);
                await connection.rollback();
                return res.status(400).json({ message: `No available IDs found in range (${start}-${end})` });
            }

            // Convert available IDs into mini ranges
            let miniStart = pausedIds[0];
            for (let i = 1; i < pausedIds.length; i++) {
                if (pausedIds[i] !== pausedIds[i - 1] + 1) {
                    finalMiniRanges.push({ start: miniStart, end: pausedIds[i - 1] });
                    miniStart = pausedIds[i];
                }
            }
            finalMiniRanges.push({ start: miniStart, end: pausedIds[pausedIds.length - 1] });
        }

        console.log("🧱 Final mini-ranges:", finalMiniRanges);

        const hashedPassword = await bcrypt.hash(password, 10);

        const [subAdminResult] = await connection.query(
            "INSERT INTO login (username, password, role) VALUES (?, ?, ?)",
            [username, hashedPassword, role]
        );
        const subAdminId = subAdminResult.insertId;
        console.log("✅ Sub-Admin Inserted with ID:", subAdminId);

        for (const miniRange of finalMiniRanges) {
            console.log(`📌 Inserting range: (${miniRange.start}-${miniRange.end})`);
            await connection.query(
                "INSERT INTO id_ranges (sub_admin_id, range_start, range_end, created_at) VALUES (?, ?, ?, NOW())",
                [subAdminId, miniRange.start, miniRange.end]
            );
        }

        if (role === 'manager' && assigned_subadmins?.length > 0) {
            for (const subAdmin of assigned_subadmins) {
                await connection.query(
                    "INSERT INTO manager_subadmins (manager_id, sub_admin_id) VALUES (?, ?)",
                    [subAdminId, subAdmin]
                );
                console.log(`👥 Assigned Sub-Admin ${subAdmin} to Manager ${subAdminId}`);
            }
        }

        await connection.commit();

        console.log("✅ Sub-Admin Created Successfully");
        res.status(201).json({
            success: true,
            message: "Sub-admin created successfully",
            subAdmin: {
                id: subAdminId,
                username,
                role,
                ranges: finalMiniRanges,
                assigned_subadmins: role === 'manager' ? assigned_subadmins : undefined
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
};






// Create Sub-Admin
// exports.createSubAdmin = async (req, res) => {
//     const connection = await db.getConnection(); // Start a transaction
//     try {
//         console.log("🟢 Create Sub-Admin Request Received:", req.body);

//         const { username, password, role, ranges, assigned_subadmins } = req.body;

//         // ✅ Validation: Ensure all fields are provided
//         if (!username || !password || !role || !ranges || !Array.isArray(ranges) || ranges.length === 0) {
//             return res.status(400).json({ message: "All fields are required" });
//         }

//         await connection.beginTransaction();

//         // ✅ Check for Range Conflicts
//         for (const range of ranges) {
//             const { start, end } = range;

//             const [existingRanges] = await connection.query(
//                 "SELECT * FROM id_ranges WHERE (range_start <= ? AND range_end >= ?) OR (range_start <= ? AND range_end >= ?) OR (range_start >= ? AND range_end <= ?)",
//                 [start, start, end, end, start, end]
//             );

//             if (existingRanges.length) {
//                 console.warn("⚠️ Range Conflict Detected");
//                 await connection.rollback(); // Rollback transaction
//                 return res.status(400).json({ message: `The selected range (${start}-${end}) overlaps with an existing sub-admin` });
//             }
//         }

//         // ✅ Hash Password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // ✅ Insert Sub-Admin into Database
//         const [subAdminResult] = await connection.query(
//             "INSERT INTO login (username, password, role) VALUES (?, ?, ?)",
//             [username, hashedPassword, role]
//         );

//         const subAdminId = subAdminResult.insertId;

//         // ✅ Insert Ranges into Database
//         for (const range of ranges) {
//             await connection.query(
//                 "INSERT INTO id_ranges (sub_admin_id, range_start, range_end, created_at) VALUES (?, ?, ?, NOW())",
//                 [subAdminId, range.start, range.end]
//             );
//         }

//         // ✅ If role is 'manager', assign sub-admins
//         if (role === 'manager' && assigned_subadmins && Array.isArray(assigned_subadmins) && assigned_subadmins.length > 0) {
//             for (const subAdmin of assigned_subadmins) {
//                 await connection.query(
//                     "INSERT INTO manager_subadmins (manager_id, sub_admin_id) VALUES (?, ?)",
//                     [subAdminId, subAdmin]
//                 );
//             }
//         }

//         await connection.commit(); // Commit transaction

//         console.log("✅ Sub-Admin Created Successfully");
//         res.status(201).json({
//             success: true,
//             message: "Sub-admin created successfully",
//             subAdmin: {
//                 id: subAdminId,
//                 username,
//                 role,
//                 ranges,
//                 assigned_subadmins: role === 'manager' ? assigned_subadmins : undefined
//             }
//         });
//     } catch (error) {
//         await connection.rollback(); // Rollback transaction on error
//         console.error("❌ Server Error:", error);
//         res.status(500).json({ message: "Internal server error" });
//     } finally {
//         connection.release(); // Release connection
//     }
// };



// Login Sub-Admin
// exports.loginSubAdmin = async (req, res) => {
//     try {
//         console.log("🟢 Login Request Received:", req.body);

//         const { username, password } = req.body;

//         // ✅ Validation: Ensure both username and password are provided
//         if (!username || !password) {
//             return res.status(400).json({ message: "Username and password are required" });
//         }

//         // ✅ Fetch Sub-Admin by Username
//         const [results] = await db.query("SELECT * FROM login WHERE username = ?", [username]);

//         if (!results.length) {
//             console.warn("⚠️ Sub-Admin not found");
//             return res.status(401).json({ message: "Invalid username or password" });
//         }

//         const subAdmin = results[0];

//         // ✅ Verify Password
//         const passwordMatch = await bcrypt.compare(password, subAdmin.password);

//         if (!passwordMatch) {
//             console.warn("⚠️ Incorrect password");
//             return res.status(401).json({ message: "Invalid username or password" });
//         }

//         // ✅ Fetch Range Details
//         const [rangeResults] = await db.query("SELECT range_start, range_end FROM id_ranges WHERE sub_admin_id = ?", [subAdmin.id]);
//         const range = rangeResults.length ? rangeResults[0] : { range_start: null, range_end: null };

//         console.log("✅ Sub-Admin logged in successfully!");
//         res.status(200).json({
//             success: true,
//             message: "Login successful",
//             subAdmin: {
//                 id: subAdmin.id,
//                 username: subAdmin.username,
//                 role: subAdmin.role,
//                 range: {
//                     range_start: range.range_start,
//                     range_end: range.range_end
//                 }
//             }
//         });

//     } catch (error) {
//         console.error("❌ Server Error:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

// Login Sub-Admin
exports.loginSubAdmin = async (req, res) => {
    try {
        console.log("🟢 Login Request Received:", req.body);

        const { username, password } = req.body;

        // ✅ Validation: Ensure both username and password are provided
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        // ✅ Fetch Sub-Admin and Ranges Using JOIN
        const query = `
            SELECT 
                l.id AS sub_admin_id,
                l.username,
                l.role,
                l.password,
                ir.range_start,
                ir.range_end
            FROM login l
            LEFT JOIN id_ranges ir ON l.id = ir.sub_admin_id
            WHERE l.username = ?
        `;

        const [results] = await db.query(query, [username]);

        if (!results.length) {
            console.warn("⚠️ Sub-Admin not found");
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const subAdmin = {
            id: results[0].sub_admin_id,
            username: results[0].username,
            role: results[0].role,
            password: results[0].password
        };

        // ✅ Verify Password
        const passwordMatch = await bcrypt.compare(password, subAdmin.password);

        if (!passwordMatch) {
            console.warn("⚠️ Incorrect password");
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // ✅ Map Multiple Ranges into an Array
        const ranges = results
            .filter(r => r.range_start && r.range_end)
            .map(r => ({
                start: r.range_start,
                end: r.range_end
            }));

        let assignedSubAdmins = [];

        // ✅ If Role is 'manager', Fetch Assigned Sub-Admins
        if (subAdmin.role === 'manager') {
            const [assignedResults] = await db.query(
                "SELECT sub_admin_id FROM manager_subadmins WHERE manager_id = ?",
                [subAdmin.id]
            );

            assignedSubAdmins = assignedResults.map(row => row.sub_admin_id);
        }

        console.log("✅ Sub-Admin logged in successfully!");
        res.status(200).json({
            success: true,
            message: "Login successful",
            subAdmin: {
                id: subAdmin.id,
                username: subAdmin.username,
                role: subAdmin.role,
                ranges, // Now returns multiple ranges in an array
                assigned_subadmins: subAdmin.role === 'manager' ? assignedSubAdmins : undefined
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
      const [user] = await db.query("SELECT password FROM login WHERE id = ?", [userId]);
  
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
      await db.query("UPDATE login SET password = ? WHERE id = ?", [hashedPassword, userId]);
  
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
                a.adv_id, a.adv_payout, a.pub_id AS adv_pub_id, a.pid AS adv_pid, a.shared_date AS adv_shared_date, 
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
    console.log("id", userId);

    try {
        // ✅ Fetch role from login table
        const [results] = await db.query("SELECT id, role FROM login WHERE id = ?", [userId]);

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const { id, role } = results[0];

        let userData = [];

        // ✅ Fetch data based on role
        if (role === "advertiser") {
            const [advData] = await db.query("SELECT * FROM adv_data WHERE user_id = ?", [userId]);
            userData = advData;
        } else if (role === "publisher") {
            const [pubData] = await db.query("SELECT * FROM pub_data WHERE user_id = ?", [userId]);
            userData = pubData;
        } else if (role === "manager") {
            // ✅ If role is manager, get data from both tables
            const [advData] = await db.query("SELECT * FROM adv_data WHERE user_id = ?", [userId]);
            const [pubData] = await db.query("SELECT * FROM pub_data WHERE user_id = ?", [userId]);

            userData = {
                advertiser_data: advData,
                publisher_data: pubData
            };
        } else {
            return res.status(400).json({ error: "Invalid role" });
        }

        // ✅ Return structured response
        return res.json({ 
            role, 
            data: userData 
        });

    } catch (err) {
        console.error("❌ Error fetching user data:", err);
        return res.status(500).json({ error: "Database error" });
    }
};


// exports.getUserData = async (req, res) => {
//     const userId = req.params.userId;
// console.log("id",userId)
//     try {
//         // Fetch role from login table
//         const [results] = await db.query("SELECT id, role FROM login WHERE id = ?", [userId]);

//         if (results.length === 0) {
//             return res.status(404).json({ error: "User not found" });
//         }

//         const { id, role } = results[0];

//         // Decide table based on role
//         let query;
//         if (role === "advertiser") {
//             query = "SELECT * FROM adv_data WHERE user_id = ?";
//         } else if (role === "publisher") {
//             query = "SELECT * FROM pub_data WHERE user_id = ?";
//         } else {
//             return res.status(400).json({ error: "Invalid role" });
//         }

//         // Fetch user data from the selected table
//         const [userData] = await db.query(query, [userId]);

//         return res.json({ role, data: userData });

//     } catch (err) {
//         console.error("Error fetching user data:", err);
//         return res.status(500).json({ error: "Database error" });
//     }
// };

// // Get Sub Admins along with ID Ranges data
// exports.getSubAdmins = async (req, res) => {
//     try {
//         // Fetch all users from login table along with their corresponding id_ranges data
//         const query = `
//             SELECT l.*, ir.*
//             FROM login l
//             LEFT JOIN id_ranges ir ON l.id = ir.sub_admin_id
//         `;

//         const [entries] = await db.query(query);

//         res.status(200).json({ success: true, data: entries });
//     } catch (error) {
//         console.error("❌ Server Error:", error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// };

// Get Sub Admins along with ID Ranges data
exports.getSubAdmins = async (req, res) => {
    try {
        // Fetch all users and their id ranges
        const query = `
            SELECT 
                l.id AS sub_admin_id,
                l.username,
                l.role,
                ir.range_start,
                ir.range_end
            FROM login l
            LEFT JOIN id_ranges ir ON l.id = ir.sub_admin_id
        `;

        const [entries] = await db.query(query);

        // ✅ Group by sub-admin and combine ranges into an array
        const subAdmins = entries.reduce((acc, entry) => {
            const { sub_admin_id, username, role, range_start, range_end } = entry;

            // Find existing sub-admin entry
            let subAdmin = acc.find(item => item.id === sub_admin_id);

            if (!subAdmin) {
                subAdmin = {
                    id: sub_admin_id,
                    username,
                    role,
                    ranges: []
                };
                acc.push(subAdmin);
            }

            if (range_start && range_end) {
                subAdmin.ranges.push({ start: range_start, end: range_end });
            }

            return acc;
        }, []);

        res.status(200).json({ success: true, data: subAdmins });
    } catch (error) {
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


// Update review in pub_data by ID
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params; // Get ID from URL
        const { review } = req.body; // Get review from request body

        // 🛑 Check if ID and review are provided
        if (!id || !review) {
            return res.status(400).json({ success: false, message: "ID and review are required." });
        }

        // 🔍 Check if record exists
        const [existingRecord] = await db.query("SELECT * FROM pub_data WHERE id = ?", [id]);

        if (existingRecord.length === 0) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }

        // ✅ Update the review
        const [result] = await db.query(
            "UPDATE pub_data SET review = ? WHERE id = ?",
            [review, id]
        );

        if (result.affectedRows === 0) {
            return res.status(500).json({ success: false, message: "Update failed. No changes applied." });
        }

        // 🎉 Successfully updated
        res.status(200).json({ success: true, message: "Review updated successfully." });

    } catch (error) {
        console.error("❌ Error updating review:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// ✅ Update Sub-Admin
// exports.updateSubAdmin = async (req, res) => {
//     const connection = await db.getConnection();
//     try {
//         console.log("🟡 Update Sub-Admin Request Received:", req.body);

//         const { id, username, password, role, ranges, assigned_subadmins } = req.body;

//         if (!id || !username || !role || !ranges || !Array.isArray(ranges) || ranges.length === 0) {
//             return res.status(400).json({ message: "All fields are required" });
//         }

//         await connection.beginTransaction();

//         // ✅ Check for Range Conflicts
//         for (const range of ranges) {
//             const { start, end } = range;

//             const [existingRanges] = await connection.query(
//                 "SELECT * FROM id_ranges WHERE ((range_start <= ? AND range_end >= ?) OR (range_start <= ? AND range_end >= ?) OR (range_start >= ? AND range_end <= ?)) AND sub_admin_id != ?",
//                 [start, start, end, end, start, end, id]
//             );

//             if (existingRanges.length) {
//                 console.warn("⚠️ Range Conflict Detected");
//                 await connection.rollback();
//                 return res.status(400).json({ message: `The selected range (${start}-${end}) overlaps with another sub-admin` });
//             }
//         }

//         // ✅ Update Password (Only if Provided)
//         let hashedPassword;
//         if (password) {
//             hashedPassword = await bcrypt.hash(password, 10);
//             await connection.query("UPDATE login SET password = ? WHERE id = ?", [hashedPassword, id]);
//         }

//         // ✅ Update Sub-Admin Details
//         await connection.query("UPDATE login SET username = ?, role = ? WHERE id = ?", [username, role, id]);

//         // ✅ Delete Existing Ranges & Re-Insert New Ones
//         await connection.query("DELETE FROM id_ranges WHERE sub_admin_id = ?", [id]);
//         for (const range of ranges) {
//             await connection.query(
//                 "INSERT INTO id_ranges (sub_admin_id, range_start, range_end, created_at) VALUES (?, ?, ?, NOW())",
//                 [id, range.start, range.end]
//             );
//         }

//         // ✅ Update Assigned Sub-Admins (Only if Role is Manager)
//         if (role === "manager") {
//             await connection.query("DELETE FROM manager_subadmins WHERE manager_id = ?", [id]);

//             if (assigned_subadmins && Array.isArray(assigned_subadmins) && assigned_subadmins.length > 0) {
//                 for (const subAdmin of assigned_subadmins) {
//                     await connection.query(
//                         "INSERT INTO manager_subadmins (manager_id, sub_admin_id) VALUES (?, ?)",
//                         [id, subAdmin]
//                     );
//                 }
//             }
//         }

//         await connection.commit();

//         console.log("✅ Sub-Admin Updated Successfully");
//         res.status(200).json({
//             success: true,
//             message: "Sub-admin updated successfully",
//             subAdmin: {
//                 id,
//                 username,
//                 role,
//                 ranges,
//                 assigned_subadmins: role === "manager" ? assigned_subadmins : undefined,
//             },
//         });
//     } catch (error) {
//         await connection.rollback();
//         console.error("❌ Server Error:", error);
//         res.status(500).json({ message: "Internal server error" });
//     } finally {
//         connection.release();
//     }
// };

exports.updateSubAdmin = async (req, res) => {
    const connection = await db.getConnection();
    try {
        console.log("🟡 Update Sub-Admin Request Received:", req.body);

        const { id, username, password, role, ranges, assigned_subadmins } = req.body;

        if (!id || !username || !role || !Array.isArray(ranges) || ranges.length === 0) {
            return res.status(400).json({ message: "All fields are required" });
        }

        await connection.beginTransaction();

        let finalMiniRanges = [];

        for (const range of ranges) {
            const { start, end } = range;
            console.log(`🔍 Checking range (${start}-${end})`);

            const pausedIds = [];

            for (let i = parseInt(start); i <= parseInt(end); i++) {
                console.log(`➡️ Checking ID: ${i}`);

                const [advCheck] = await connection.query("SELECT pause FROM advids WHERE adv_id = ?", [i]);
                const isAdvPaused = advCheck.length > 0 && advCheck[0].pause == 1;
                console.log(`   advids => Found: ${advCheck.length > 0}, Paused: ${isAdvPaused}`);

                const [pubCheck] = await connection.query("SELECT pause FROM publids WHERE pub_id = ?", [i]);
                const isPubPaused = pubCheck.length > 0 && pubCheck[0].pause == 1;
                console.log(`   publids => Found: ${pubCheck.length > 0}, Paused: ${isPubPaused}`);

                const [idRangeCheck] = await connection.query("SELECT * FROM id_ranges WHERE ? BETWEEN range_start AND range_end AND sub_admin_id != ?", [i, id]);
                const isAssignedInIdRanges = idRangeCheck.length > 0;
                console.log(`   id_ranges => Assigned to others: ${isAssignedInIdRanges}`);

                const existsInAdv = advCheck.length > 0;
                const existsInPub = pubCheck.length > 0;
                const existsAnywhere = existsInAdv || existsInPub || isAssignedInIdRanges;

                if ((isAdvPaused || isPubPaused) || !existsAnywhere) {
                    pausedIds.push(i);
                    console.log(`✅ ID ${i} is AVAILABLE`);
                } else {
                    console.log(`❌ ID ${i} is NOT available`);
                }
            }

            if (pausedIds.length === 0) {
                console.warn(`⚠️ No available IDs found in range (${start}-${end})`);
                await connection.rollback();
                return res.status(400).json({ message: `No available IDs found in range (${start}-${end})` });
            }

            // Convert available IDs into mini ranges
            let miniStart = pausedIds[0];
            for (let i = 1; i < pausedIds.length; i++) {
                if (pausedIds[i] !== pausedIds[i - 1] + 1) {
                    finalMiniRanges.push({ start: miniStart, end: pausedIds[i - 1] });
                    miniStart = pausedIds[i];
                }
            }
            finalMiniRanges.push({ start: miniStart, end: pausedIds[pausedIds.length - 1] });
        }

        console.log("🧱 Final mini-ranges for update:", finalMiniRanges);

        // ✅ Update password (only if provided)
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await connection.query("UPDATE login SET password = ? WHERE id = ?", [hashedPassword, id]);
            console.log("🔐 Password updated");
        }

        // ✅ Update login info
        await connection.query("UPDATE login SET username = ?, role = ? WHERE id = ?", [username, role, id]);
        console.log("🔁 Username & role updated");

        // ✅ Clear and insert updated ranges
        await connection.query("DELETE FROM id_ranges WHERE sub_admin_id = ?", [id]);
        for (const miniRange of finalMiniRanges) {
            console.log(`📌 Inserting updated range: (${miniRange.start}-${miniRange.end})`);
            await connection.query(
                "INSERT INTO id_ranges (sub_admin_id, range_start, range_end, created_at) VALUES (?, ?, ?, NOW())",
                [id, miniRange.start, miniRange.end]
            );
        }

        // ✅ Handle manager assignments
        if (role === 'manager') {
            await connection.query("DELETE FROM manager_subadmins WHERE manager_id = ?", [id]);

            if (Array.isArray(assigned_subadmins) && assigned_subadmins.length > 0) {
                for (const subAdmin of assigned_subadmins) {
                    await connection.query(
                        "INSERT INTO manager_subadmins (manager_id, sub_admin_id) VALUES (?, ?)",
                        [id, subAdmin]
                    );
                    console.log(`👥 Assigned Sub-Admin ${subAdmin} to Manager ${id}`);
                }
            }
        }

        await connection.commit();

        console.log("✅ Sub-Admin Updated Successfully");
        res.status(200).json({
            success: true,
            message: "Sub-admin updated successfully",
            subAdmin: {
                id,
                username,
                role,
                ranges: finalMiniRanges,
                assigned_subadmins: role === 'manager' ? assigned_subadmins : undefined
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
};




// ✅ Delete Sub-Admin
exports.deleteSubAdmin = async (req, res) => {
    const connection = await db.getConnection();
    try {
        console.log("🔴 Delete Sub-Admin Request Received:", req.body);

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Sub-admin ID is required" });
        }

        await connection.beginTransaction();

        // ✅ Remove Ranges
        await connection.query("DELETE FROM id_ranges WHERE sub_admin_id = ?", [id]);

        // ✅ Remove Assigned Sub-Admins (If Manager)
        await connection.query("DELETE FROM manager_subadmins WHERE manager_id = ?", [id]);

        // ✅ Remove Sub-Admin from Login
        const [result] = await connection.query("DELETE FROM login WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: "Sub-admin not found" });
        }

        await connection.commit();

        console.log("✅ Sub-Admin Deleted Successfully");
        res.status(200).json({ success: true, message: "Sub-admin deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("❌ Server Error:", error);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        connection.release();
    }
};