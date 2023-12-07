const mongoose = require('mongoose');

const supportRequestSchema = new mongoose.Schema({
  telegramId: Number,
  userName: String,
  text: String,
  createdAt: {
    type: Date,
    immutable: true,
    default: () => Date.now(),
  },
  updatedAt: {
    type: Date,
    default: () => Date.now(),
  },
});

module.exports = mongoose.model('SupportRequests', supportRequestSchema);
