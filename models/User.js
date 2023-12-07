const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, unique: true },
  firstName: String,
  userName: String,
  answers: { type: {}, default: { 0: '' } },
  hasBlockedBot: {
    type: Boolean,
    default: false,
  },
  waitingForSupportRequest: Boolean,
  waitingForAnswerNumber: {
    type: String,
    default: '',
  },
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

module.exports = mongoose.model('Users', userSchema);
