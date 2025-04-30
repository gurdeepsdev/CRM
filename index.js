const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const db = require("./db/Connection"); // Assuming you have a db file for MySQL connection


// File: backend/index.js

const multer = require("multer");

const xlsx = require("xlsx");
const exceljs = require("exceljs");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://160.153.172.237:5371", "https://crm.clickorbits.in","http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Store the io instance in app.locals for later use
app.locals.io = io;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));


const upload = multer({ dest: "uploads/" });

  // app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));
  //  ^|^e Enable JSON parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  //const upload = multer({ dest: "/" });
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });

  const scaleValues = (arr) => {
    const result = [];
  
    // Helper to calculate percent safely
    const getPercent = (first, second) => {
      const sum = first + second;
      if (sum === 0) {
        return [0, 0]; // If both are 0, push 0, 0
      }
      const firstPercent = Math.round((first / sum) * 100);
      const secondPercent = 100 - firstPercent; // Force exactly 100 total
      return [firstPercent, secondPercent];
    };
  
    // Install comparison
    const [installSecondLast, installLast] = getPercent(arr[0] || 0, arr[3] || 0);
  
    // Realtime comparison
    const [realtimeSecondLast, realtimeLast] = getPercent(arr[1] || 0, arr[4] || 0);
  
    // P360 comparison
    const [p360SecondLast, p360Last] = getPercent(arr[2] || 0, arr[5] || 0);
  
    // Push values in the desired order
    result.push(
      installSecondLast,
      realtimeSecondLast,
      p360SecondLast,
      installLast,
      realtimeLast,
      p360Last
    );
  
    return result;
  };
  
  
  app.post("/process-excel", upload.single("file"), (req, res) => {
    try {
      const { sheetName } = req.body;
          const workbook = xlsx.readFile(req.file.path);
      
      // const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const selectedSheet = sheetName?.trim() || workbook.SheetNames[0];
  
      const ws = workbook.Sheets[selectedSheet];
      if (!ws)
        return res
          .status(400)
          .json({ error: `Sheet "${selectedSheet}" not found` });
  
      const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });
      if (!rawData.length) return res.status(400).json({ error: "Empty file" });
  
      const headers = rawData[0];
      const dataRows = rawData.slice(1);
      const dateIndices = headers
        .map((h, i) => (String(h).toLowerCase() === "date" ? i : -1))
        .filter((i) => i !== -1);
  
      if (dateIndices.length < 2) {
        return res
          .status(400)
          .json({ error: "Need at least 2 'Date' blocks to compare" });
      }
  
      const secondLastIndex = dateIndices[dateIndices.length - 2];
      const lastIndex = dateIndices[dateIndices.length - 1];
      const pidIndex = headers.indexOf("PID");
  
      const extractColumns = (rows, startIndex, keys) =>
        rows.map((row) => ({
          pid: row[pidIndex] || "Unknown",
          date: row[startIndex] || "Unknown",
          ...Object.fromEntries(
            keys.map((key, i) => [
              key.toLowerCase(),
              parseInt(row[startIndex + 1 + i], 10) || 0,
            ])
          ),
        }));
  
      const originalKeys = ["Install", "Realtime", "P360"];
      const newKeys = ["Event", "Realtime", "P360"];
  
      const secondLastBlockData = extractColumns(
        dataRows,
        secondLastIndex,
        originalKeys
      );
      const lastBlockData = extractColumns(dataRows, lastIndex, originalKeys);
  
      const secondLastNewData = extractColumns(
        dataRows,
        secondLastIndex + 5,
        newKeys
      );
      const lastNewData = extractColumns(dataRows, lastIndex + 5, newKeys);
  
      const groupedData = {};
      const groupedNewData = {};
  
      [...secondLastBlockData, ...lastBlockData].forEach((data) => {
        groupedData[data.pid] ||= {
          secondLast: { install: 0, realtime: 0, p360: 0 },
          last: { install: 0, realtime: 0, p360: 0 },
        };
  
        if (data.date === secondLastBlockData[0].date) {
          groupedData[data.pid].secondLast = {
            install: data.install,
            realtime: data.realtime,
            p360: data.p360,
          };
        } else if (data.date === lastBlockData[0].date) {
          groupedData[data.pid].last = {
            install: data.install,
            realtime: data.realtime,
            p360: data.p360,
          };
        }
      });
  
      [...secondLastNewData, ...lastNewData].forEach((data) => {
        groupedNewData[data.pid] ||= {
          secondLast: { event: 0, realtime: 0, p360: 0 },
          last: { event: 0, realtime: 0, p360: 0 },
        };
  
        groupedNewData[data.pid].secondLast = {
          event: data.event,
          realtime: data.realtime,
          p360: data.p360,
        };
  
        groupedNewData[data.pid].last = {
          event: data.event,
          realtime: data.realtime,
          p360: data.p360,
        };
      });
  
      const secondDate = secondLastBlockData[0]?.date || "Second Last";
      const lastDate = lastBlockData[0]?.date || "Last";
  
      const charts = [];
  
      // Process Install/Realtime/P360
      Object.keys(groupedData).forEach((pid) => {
        const data = groupedData[pid];
        const allValues = [
          data.secondLast.install,
          data.secondLast.realtime,
          data.secondLast.p360,
          data.last.install,
          data.last.realtime,
          data.last.p360,
        ];
        const scaled = scaleValues(allValues);
  
        charts.push({
          pid,
          type: "install",
          labels: ["Install", "Realtime", "P360"],
          secondDate,
          lastDate,
          datasets: [
            {
              label: `${pid} - ${secondDate}`,
              data: scaled.slice(0, 3),
              actualValues: [
                data.secondLast.install,
                data.secondLast.realtime,
                data.secondLast.p360,
              ],
              backgroundColor: "rgba(54, 162, 235, 0.6)",
            },
            {
              label: `${pid} - ${lastDate}`,
              data: scaled.slice(3, 6),
              actualValues: [
                data.last.install,
                data.last.realtime,
                data.last.p360,
              ],
              backgroundColor: "rgba(255, 99, 132, 0.6)",
            },
          ],
        });
      });
  
      // Process Event/Realtime/P360
      Object.keys(groupedNewData).forEach((pid) => {
        const data = groupedNewData[pid];
        const allValues = [
          data.secondLast.event,
          data.secondLast.realtime,
          data.secondLast.p360,
          data.last.event,
          data.last.realtime,
          data.last.p360,
        ];
        const scaled = scaleValues(allValues);
  
        charts.push({
          pid,
          type: "event",
          labels: ["Event", "Realtime", "P360"],
          secondDate,
          lastDate,
          datasets: [
            {
              label: `${pid} - ${secondDate}`,
              data: scaled.slice(0, 3),
              actualValues: [
                data.secondLast.event,
                data.secondLast.realtime,
                data.secondLast.p360,
              ],
              backgroundColor: "rgba(153, 102, 255, 0.6)",
            },
            {
              label: `${pid} - ${lastDate}`,
              data: scaled.slice(3, 6),
              actualValues: [data.last.event, data.last.realtime, data.last.p360],
              backgroundColor: "rgba(255, 206, 86, 0.6)",
            },
          ],
        });
      });
  
      res.json({ charts });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Something went wrong" });
    }
  });
  
  const fileToTabMap = {
      "detection": "P.A_install",
      "blocked-installs": "realtime_install",
      "blocked-in-app-events": "realtime_event",
      "fraud-post-inapps": "P.A_event",
      "in-app-events": "Payble_event"
    };
    
    app.post("/upload", upload.array("files"), async (req, res) => {
      try {
        const files = req.files;
        const column = req.body.column;
    
        if (!files || files.length === 0 || !column) {
          return res.status(400).send("Files and a column name are required.");
        }
    
        const groupedData = {}; // { columnValue: { tabName: [rows] } }
        const allTabs = new Set(); // Keep track of which tabs to always include
        const fileNameMap = {}; // To keep track of generated tab names and avoid duplication
        let allHeaders = new Set();
    
        for (const file of files) {
          const fileNameWithoutExt = path.parse(file.originalname).name;
    
          // Extract suffix after last underscore (_) series — to detect keys
          const parts = fileNameWithoutExt.split("_");
          const possibleKey = parts.slice(1, parts.length - 3).join("-");
          const matchedKey = Object.keys(fileToTabMap).find(key => possibleKey.endsWith(key));
    
          let tabName = matchedKey ? fileToTabMap[matchedKey] : parts.slice(1).join("-");
          let baseName = tabName;
          let counter = 1;
    
          while (fileNameMap[tabName]) {
            tabName = `${baseName}_${counter}`;
            counter++;
          }
    
          fileNameMap[tabName] = true;
          allTabs.add(tabName);
    
          const workbook = xlsx.readFile(file.path);
          for (const sheetName of workbook.SheetNames) {
            const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
            if (data.length > 0) {
              Object.keys(data[0]).forEach(h => allHeaders.add(h));
            }
    
            for (const row of data) {
              const key = row[column] || "Undefined";
    
              if (!groupedData[key]) groupedData[key] = {};
              if (!groupedData[key][tabName]) groupedData[key][tabName] = [];
    
              groupedData[key][tabName].push(row);
            }
          }
    
          fs.unlinkSync(file.path); // cleanup
        }
    
        // Prepare output folder
        const outputDir = path.join(__dirname, "output");
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    
        const generatedFiles = [];
    
        for (const key in groupedData) {
          const wb = new exceljs.Workbook();
          const tabDataMap = groupedData[key];
          const existingSheetNames = new Set();
    
          for (const tabName of allTabs) {
            let baseName = tabName;
            let sheetName = baseName.slice(0, 31);
            let counter = 1;
    
            while (existingSheetNames.has(sheetName)) {
              const suffix = `_${counter}`;
              const maxLen = 31 - suffix.length;
              sheetName = baseName.slice(0, maxLen) + suffix;
              counter++;
            }
    
            existingSheetNames.add(sheetName);
            const ws = wb.addWorksheet(sheetName);
            const rows = tabDataMap[tabName] || [];
    
            if (rows.length > 0) {
              const headers = Object.keys(rows[0]);
              ws.addRow(headers);
              rows.forEach((row) => ws.addRow(headers.map((h) => row[h])));
            } else {
              const headers = Array.from(allHeaders);
              ws.addRow(headers.length > 0 ? headers : ["No data"]);
            }
          }
    
          const fileName = `${key}.xlsx`;
          const filePath = path.join(outputDir, fileName);
          await wb.xlsx.writeFile(filePath);
          generatedFiles.push(filePath);
        }
    
        // Create zip of all grouped Excel files
        const zipPath = path.join(__dirname, "grouped_data.zip");
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
    
        output.on("close", () => {
          res.download(zipPath, () => {
            fs.unlinkSync(zipPath);
            fs.rmSync(outputDir, { recursive: true, force: true });
          });
        });
    
        archive.on("error", (err) => {
          throw err;
        });
    
        archive.pipe(output);
        generatedFiles.forEach((file) => archive.file(file, { name: path.basename(file) }));
        archive.finalize();
      } catch (error) {
        console.error(error);
        res.status(500).send("An error occurred while processing the files.");
      }
    });
    

// Add Pub Request API
app.post('/addPubRequest', async (req, res) => {
  try {
    console.log("🟢 Add Pub Request Received:", req.body);

    const { adv_name, campaign_name, payout, os } = req.body;

    const [result] = await db.query(
      `INSERT INTO pub_req (adv_name, campaign_name, payout, os) VALUES (?, ?, ?, ?)`,
      [adv_name, campaign_name, payout, os]
    );

    console.log("✅ Pub Request Added Successfully");

    // Emit event using the io instance from app.locals
    const io = req.app.locals.io;
    io.emit('pub_request_added', {
      id: result.insertId,
      adv_name,
      campaign_name,
      payout,
      os
    });

    res.status(201).json({
      success: true,
      message: "Pub request added successfully",
      id: result.insertId
    });

  } catch (error) {
    console.error("❌ Error in addPubRequest:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// Update Adv Res API
app.put('/updateAdvRes', async (req, res) => {
  try {
    console.log("🟡 Update adv_res Request Received:", req.body);

    const { id, adv_res } = req.body;

    if (!id || adv_res === undefined) {
      return res.status(400).json({
        success: false,
        message: "ID and adv_res are required"
      });
    }

    const [result] = await db.query(
      `UPDATE pub_req SET adv_res = ? WHERE id = ?`,
      [adv_res, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "No pub request found with the given ID"
      });
    }

    console.log("✅ adv_res Updated Successfully");

    // Emit event
    const io = req.app.locals.io;
    io.emit('adv_res_updated', { id, adv_res });

    res.status(200).json({
      success: true,
      message: "adv_res updated successfully"
    });

  } catch (error) {
    console.error("❌ Error in updateAdvRes:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// Get All Pub Requests API
app.get('/getAllPubRequests', async (req, res) => {
  try {
    console.log("🔵 Get All Pub Requests Received");

    const [rows] = await db.query(`SELECT * FROM pub_req`);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No pub requests found"
      });
    }

    console.log(`✅ Fetched ${rows.length} Pub Requests`);

    res.status(200).json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error("❌ Error in getAllPubRequests:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  socket.emit("welcome", "Connected to notification system");

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 5200;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
