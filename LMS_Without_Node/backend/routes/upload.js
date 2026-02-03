const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const cloudinary = require('cloudinary').v2;

// Cloudinary config (ensure these are set in your .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload video or PDF to Cloudinary
router.post('/file', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Determine resource type based on mime type
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
      resourceType = 'raw';
    }
    
    console.log(`Uploading file: ${req.file.originalname}, mimetype: ${req.file.mimetype}, resourceType: ${resourceType}`);
    
    // Build upload options based on resource type
    const uploadOptions = { 
      resource_type: resourceType, 
      folder: 'lms_materials'
    };
    
    // Only add transformation options for videos, not for raw files (PDFs, docs)
    if (resourceType === 'video') {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
    }
    
    const result = await cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return res.status(500).json({ message: error.message });
        }
        console.log(`Upload successful: public_id=${result.public_id}, url=${result.secure_url.substring(0, 80)}...`);
        res.json({ 
          url: result.secure_url, 
          public_id: result.public_id,
          resourceType: resourceType
        });
      }
    );
    // Pipe the buffer to Cloudinary
    require('streamifier').createReadStream(req.file.buffer).pipe(result);
  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
