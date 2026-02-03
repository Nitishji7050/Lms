const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload video recording to Cloudinary
 * @param {Buffer} fileBuffer - Video file buffer
 * @param {String} fileName - Name of the file
 * @param {String} folder - Cloudinary folder path
 * @returns {Promise} - Upload result with public_id and secure_url
 */
exports.uploadVideoRecording = async (fileBuffer, fileName, folder = 'lms/recordings') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video',
        folder: folder,
        public_id: fileName,
        quality: 'auto',
        fetch_format: 'auto'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            publicId: result.public_id,
            url: result.secure_url,
            duration: result.duration,
            fileSize: result.bytes,
            format: result.format
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete video recording from Cloudinary
 * @param {String} publicId - Public ID of the resource to delete
 * @returns {Promise} - Deletion result
 */
exports.deleteVideoRecording = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to delete recording: ${error.message}`);
  }
};

/**
 * Get video info from Cloudinary
 * @param {String} publicId - Public ID of the resource
 * @returns {Promise} - Video information
 */
exports.getVideoInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video'
    });
    return result;
  } catch (error) {
    throw new Error(`Failed to get video info: ${error.message}`);
  }
};

/**
 * Generate optimized video URL
 * @param {String} publicId - Public ID of the video
 * @param {Object} options - Transformation options
 * @returns {String} - Optimized video URL
 */
exports.getOptimizedVideoUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto'
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, {
    resource_type: 'video',
    ...finalOptions
  });
};

