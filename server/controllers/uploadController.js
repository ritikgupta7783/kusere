const cloudinary = require('cloudinary').v2;
const config = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/apiError');

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Choose a JPEG, PNG, WebP or GIF image', 'IMAGE_REQUIRED');
  }

  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(500, 'Cloudinary is not configured on the server', 'CLOUDINARY_NOT_CONFIGURED');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  const upload = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'bimari-mitao/products',
        resource_type: 'image',
        transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(req.file.buffer);
  });

  res.status(201).json({
    success: true,
    url: upload.secure_url,
    publicId: upload.public_id,
  });
});

module.exports = { uploadImage };
