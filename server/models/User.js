/**
 * models/User.js — User schema and model for MongoDB
 * Defines the user attributes, roles, and schema constraints for authentication and authorization.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email address'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  role: {
    type: String,
    enum: {
      values: ['attendee', 'organizer', 'admin'],
      message: '{VALUE} is not a valid role',
    },
    default: 'attendee',
  },
  isSuspended: {
    type: Boolean,
    default: false,
    index: true,
  },
  suspensionReason: {
    type: String,
    default: '',
  },
  suspendedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Compare entered password with hashed password in database
 * @param {string} enteredPassword - Password entered by user
 * @returns {Promise<boolean>} True if match, false otherwise
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
