const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure Multer for File Storage in Memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max limit
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === ".mp3" || file.mimetype === "audio/mpeg") {
            cb(null, true);
        } else {
            cb(new Error("Only .mp3 files are allowed!"));
        }
    }
});

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Upload Endpoint
app.post("/api/upload-audio", upload.single("audio"), async (req, res) => {
    try {
        const { igHandle, message } = req.body;
        const audioFile = req.file;

        if (!audioFile) {
            return res.status(400).json({ error: "Please upload an MP3 file." });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVING_EMAIL || process.env.EMAIL_USER,
            subject: `New MP3 Submission from ${igHandle || "Website Visitor"}`,
            text: `Instagram @: ${igHandle || "N/A"}\nMessage: ${message || "No message provided."}`,
            attachments: [
                {
                    filename: audioFile.originalname,
                    content: audioFile.buffer,
                    contentType: "audio/mpeg"
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: "MP3 and message sent successfully!" });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.message || "Failed to send audio." });
    }
});

// Server Listener
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));