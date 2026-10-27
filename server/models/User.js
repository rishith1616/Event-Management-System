/**
 * models/User.js — User Mongoose Schema and Model
 * 
 * Defines the user schema supporting role-based access control (attendee, organizer, admin),
 * credential authentication, and user references for ticket bookings and event ownership.
 * Suitable for a university software engineering course demonstrating MongoDB schema modeling.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
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
  },
  {
    timestamps: true,
  }
);

/**
 * Compare entered plaintext password with bcrypt-hashed password in database.
 * @param {string} enteredPassword - The plaintext password supplied during authentication
 * @returns {Promise<boolean>} True if match, false otherwise
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
