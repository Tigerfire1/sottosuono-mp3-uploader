const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store uploaded files in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Server is live and listening!');
});

// Upload route
app.post(['/', '/api/upload-audio'], upload.single('audio'), async (req, res) => {
    try {
        const { igHandle, message } = req.body;
        const audioFile = req.file;

        if (!audioFile) {
            return res.status(400).json({ error: 'No audio file provided.' });
        }

        // Send via Resend HTTP API (Port 443 - Bypasses Render's SMTP block)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Music Submissions <onboarding@resend.dev>',
                to: [process.env.RECEIVING_EMAIL],
                subject: `New Track Submission from ${igHandle || 'Anonymous'}`,
                text: `Instagram Handle: ${igHandle || 'Not provided'}\n\nMessage:\n${message || 'No message provided'}`,
                attachments: [
                    {
                        filename: audioFile.originalname,
                        content: audioFile.buffer.toString('base64')
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API Error:', data);
            return res.status(500).json({ error: data.message || 'Failed to send email.' });
        }

        return res.status(200).json({ success: true, message: 'Email sent successfully!' });
    } catch (error) {
        console.error('Upload Error:', error);
        return res.status(500).json({ error: 'Failed to process email delivery.' });
    }
});

// Dynamic port assignment
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
