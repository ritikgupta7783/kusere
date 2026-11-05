const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB. Works with a local server
 * (mongodb://127.0.0.1:27017/bimari_mitao) and MongoDB Atlas (mongodb+srv://...)
 * because the only input is MONGODB_URI.
 */
async function connectDB(uri = config.mongoUri) {
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
