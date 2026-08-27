const dns = require('dns');
dns.setDefaultResultOrder('ipv4first'); // Forces IPv4 to fix ENETUNREACH on Render

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store uploaded files in memory buffer for email attachments
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB file size limit
});

// Configure Nodemailer with SSL on Port 465
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Server is live and listening!');
});

// Upload route matching Framer (accepts both / and /api/upload-audio)
app.post(['/', '/api/upload-audio'], upload.single('audio'), async (req, res) => {
    try {
        const { igHandle, message } = req.body;
        const audioFile = req.file;

        if (!audioFile) {
            return res.status(400).json({ error: 'No audio file provided.' });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVING_EMAIL || process.env.EMAIL_USER,
            subject: `New Track Submission from ${igHandle || 'Anonymous'}`,
            text: `Instagram Handle: ${igHandle || 'Not provided'}\n\nMessage:\n${message || 'No message provided'}`,
            attachments: [
                {
                    filename: audioFile.originalname,
                    content: audioFile.buffer
                }
            ]
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({ error: 'Failed to process email delivery.' });
    }
});

// Bind dynamically to Render's assigned port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
