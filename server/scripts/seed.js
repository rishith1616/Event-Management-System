/**
 * scripts/seed.js — Database seeder for demo events and test users
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Event from '../models/Event.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/event-management';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clean existing seed events (optional, keep users if exists or upsert)
    await Event.deleteMany({});
    console.log('Cleared existing events.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Create or retrieve demo Organizer
    let organizer = await User.findOne({ email: 'organizer@eventms.com' });
    if (!organizer) {
      organizer = await User.create({
        name: 'PES Event Council',
        email: 'organizer@eventms.com',
        password: hashedPassword,
        role: 'organizer',
      });
      console.log('Created demo organizer: organizer@eventms.com');
    }

    // 2. Create or retrieve demo Attendee
    let attendee = await User.findOne({ email: 'attendee@eventms.com' });
    if (!attendee) {
      attendee = await User.create({
        name: 'Rahul Sharma',
        email: 'attendee@eventms.com',
        password: hashedPassword,
        role: 'attendee',
      });
      console.log('Created demo attendee: attendee@eventms.com');
    }

    // 3. Create or retrieve demo Admin
    let admin = await User.findOne({ email: 'admin@eventms.com' });
    if (!admin) {
      admin = await User.create({
        name: 'System Administrator',
        email: 'admin@eventms.com',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('Created demo admin: admin@eventms.com');
    }

    // Helper for future dates
    const addDays = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

    // 4. Seed diverse events across categories
    const demoEvents = [
      {
        title: 'PES Hackathon 2026: Code the Future',
        description:
          'Join 500+ student developers for 24 hours of intense coding, mentorship, and $10,000 in cash prizes. Tracks include GenAI, Web3, Systems, and Sustainable Tech.',
        date: addDays(14),
        time: '09:00 AM',
        venue: 'PES University Main Auditorium, Bangalore',
        capacity: 200,
        availableTickets: 178,
        price: 15,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'Campus Spring Music Fest 2026',
        description:
          'Live indie rock, acoustic sets, and electronic music by top college and professional bands across Bangalore. Free entry for all students with registration.',
        date: addDays(7),
        time: '05:30 PM',
        venue: 'Open Air Amphitheatre, Campus Ground',
        capacity: 500,
        availableTickets: 342,
        price: 0,
        category: 'music',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'AI & Quantum Computing Research Summit',
        description:
          'Keynote addresses from leading industry researchers at Google DeepMind and Microsoft. Deep dive sessions on transformer models, robotics, and quantum circuits.',
        date: addDays(21),
        time: '10:00 AM',
        venue: 'Convention Center, Hall B',
        capacity: 120,
        availableTickets: 85,
        price: 35,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'Inter-Collegiate Football Championship',
        description:
          'Annual 16-team knockout football tournament. Cheer for your university team in thrilling floodlight evening matches with concessions and merchandise.',
        date: addDays(10),
        time: '04:00 PM',
        venue: 'University Sports Complex & Stadium',
        capacity: 350,
        availableTickets: 290,
        price: 5,
        category: 'sports',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'Startup Pitch & Venture Investment Fair',
        description:
          'Over 30 student and alumni startups pitching to angel investors and venture capital firms. Networking dinner and pitch masterclasses included.',
        date: addDays(28),
        time: '01:00 PM',
        venue: 'Innovation & Incubation Hub, 3rd Floor',
        capacity: 150,
        availableTickets: 110,
        price: 20,
        category: 'business',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'Digital Arts & Interactive Media Expo',
        description:
          'Showcase of generative art, game design student projects, 3D animations, and virtual reality demos. Open to all students and faculty.',
        date: addDays(12),
        time: '11:00 AM',
        venue: 'Fine Arts Gallery, Creative Block',
        capacity: 80,
        availableTickets: 65,
        price: 0,
        category: 'arts',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'Annual Street Food & Culinary Carnival',
        description:
          'Taste specialties from over 40 diverse regional cuisines, food trucks, and baking stalls curated by student hospitality clubs.',
        date: addDays(5),
        time: '12:00 PM',
        venue: 'Student Activity Center Plaza',
        capacity: 300,
        availableTickets: 215,
        price: 8,
        category: 'food',
        status: 'published',
        organizer: organizer._id,
      },
      {
        title: 'Cloud Architecture & DevOps Masterclass (Draft)',
        description:
          'Hands-on workshop covering Docker containerization, Kubernetes orchestration, and CI/CD pipelines with GitHub Actions.',
        date: addDays(25),
        time: '02:00 PM',
        venue: 'Computer Science Lab 4',
        capacity: 60,
        availableTickets: 60,
        price: 25,
        category: 'tech',
        status: 'draft',
        organizer: organizer._id,
      },
    ];

    const inserted = await Event.insertMany(demoEvents);
    console.log(`Successfully seeded ${inserted.length} demo events!`);

    await mongoose.disconnect();
    console.log('MongoDB disconnected cleanly.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
