/**
 * scripts/seed.js — Authentic PES University Campus Events Seeder
 * Features:
 *  - Real venues: PESU 52, MRD Building, GJBC Halls B1 & B2, Opera House (3 levels / 6 floors), Open Air Amphitheatre, Quadrangle
 *  - Real clubs: Equinox, IEEE Robotics, Samarpana, GCube, Trance, Sanskriti, E-Cell, QForest, Hopes, Aura, Shunya, MunSoc, Music Club
 *  - Real pricing: Hackathons ₹200–₹1,000 for teams, workshops ~₹500, cultural fests free, Comedy Night ₹600, Concert ₹2,000
 *  - Multi-tier seating (Opera House 3 levels, Pro-Nite VIP pit, Early Bird phases, All-Access Fest Combos)
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
    console.log('Connected to MongoDB for seeding PES events...');

    await Event.deleteMany({});
    console.log('Cleared existing events.');

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // 1. Organizer
    let organizer = await User.findOne({ email: 'organizer@eventms.com' });
    if (!organizer) {
      organizer = await User.create({
        name: 'PES Student Affairs & Club Council',
        email: 'organizer@eventms.com',
        password: hashedPassword,
        role: 'organizer',
      });
    } else {
      organizer.name = 'PES Student Affairs & Club Council';
      await organizer.save();
    }

    // 2. Attendee
    let attendee = await User.findOne({ email: 'jayanthkumar08p@gmail.com' });
    if (!attendee) {
      attendee = await User.create({
        name: 'Jayanth Kumar P',
        email: 'jayanthkumar08p@gmail.com',
        phone: '8217029299',
        srn: 'PES1UG24CS199',
        password: hashedPassword,
        role: 'attendee',
      });
    }

    // 3. Admin
    let admin = await User.findOne({ email: 'admin@eventms.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Dean of Student Affairs (PESU)',
        email: 'admin@eventms.com',
        password: hashedPassword,
        role: 'admin',
      });
    }

    const addDays = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

    const demoEvents = [
      // 1. Flagship Aatmatrisha Pro-Nite Concert
      {
        title: 'Aatmatrisha 2026: Pro-Nite Live Concert & DJ Night',
        description:
          'The biggest musical evening in Bangalore! Live headline concert by top national artists and dynamic EDM DJ pro-night at the Open Air Amphitheatre. Multiple phases and VIP Fan Pit access available.',
        date: addDays(18),
        time: '06:00 PM',
        venue: 'Open Air Amphitheatre & Main Quadrangle, PES RR Campus',
        capacity: 2500,
        availableTickets: 1780,
        price: 2000,
        category: 'music',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Phase 1 - Early Bird General',
            price: 1600,
            capacity: 800,
            available: 420,
            phase: 'Phase 1',
            seatingLevel: 'Amphitheatre Ground Tier',
            perks: ['General Admission Entry', 'Complimentary Glow Wristband'],
            description: 'Early bird access to the main amphitheatre viewing area.',
          },
          {
            name: 'Phase 2 - Regular Pass',
            price: 2000,
            capacity: 1200,
            available: 950,
            phase: 'Phase 2',
            seatingLevel: 'Amphitheatre Ground & Tiered Steps',
            perks: ['Standard Concert Admission', 'Digital Fest Entry Pass'],
            description: 'Official Phase 2 ticket for Aatmatrisha Pro-Nite.',
          },
          {
            name: 'VIP Front Stage Fan Pit',
            price: 2800,
            capacity: 500,
            available: 410,
            phase: 'VIP Access',
            seatingLevel: 'Barricade Fan Pit (Direct Stage Front)',
            perks: ['Exclusive Front-Row Stage Pit Area', 'Fast-Track Queue Entry', 'Official Aatmatrisha 2026 T-Shirt'],
            description: 'Get right next to the artists with prime sound and stage view.',
          },
        ],
      },

      // 2. Aatmatrisha Celebrity Comedy Night at Opera House
      {
        title: 'Aatmatrisha 2026: Celebrity Stand-Up Comedy Night',
        description:
          'Two hours of non-stop laughter featuring premier stand-up comedians. Hosted in the magnificent 6-floor PES Opera House with 3-tier acoustically tuned seating.',
        date: addDays(17),
        time: '06:30 PM',
        venue: 'The Opera House (6-Floor Multi-Level Auditorium), PES RR Campus',
        capacity: 1000,
        availableTickets: 720,
        price: 600,
        category: 'arts',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Phase 1 - Early Bird',
            price: 450,
            capacity: 300,
            available: 180,
            phase: 'Phase 1',
            seatingLevel: 'Level 2 Mezzanine',
            perks: ['Level 2 Mezzanine View', 'Digital Entry'],
            description: 'Limited early bird seating on the second level.',
          },
          {
            name: 'Phase 2 - Regular Reserved',
            price: 600,
            capacity: 450,
            available: 340,
            phase: 'Phase 2',
            seatingLevel: 'Level 1 Orchestra & Level 2',
            perks: ['Standard Reserved Auditorium Seat', 'Full Show Admission'],
            description: 'Standard reserved seating across Level 1 & Level 2.',
          },
          {
            name: 'Prime Front Row VIP',
            price: 850,
            capacity: 250,
            available: 200,
            phase: 'VIP',
            seatingLevel: 'Level 1 Orchestra (Rows A–E)',
            perks: ['Front Rows Closest to Stage', 'Meet & Greet Photo Opportunity'],
            description: 'The best seats in the Opera House right in front of the comedians.',
          },
        ],
      },

      // 3. Aatmatrisha All-Access Combo Fest Pass
      {
        title: 'Aatmatrisha 2026: All-Access Fest Combo Bundle (Comedy + Concert)',
        description:
          'The ultimate festival bundle! Get full access to both the Celebrity Stand-Up Comedy Night at the Opera House AND the Pro-Nite Live Concert at the Open Air Amphitheatre at massive combo savings.',
        date: addDays(17),
        time: '05:00 PM',
        venue: 'Opera House & Open Air Amphitheatre, PES RR Campus',
        capacity: 500,
        availableTickets: 310,
        price: 2400,
        category: 'music',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Early Bird Duo Combo (Save ₹500)',
            price: 2100,
            capacity: 200,
            available: 120,
            phase: 'Phase 1 Combo',
            seatingLevel: 'Both Venues Access',
            perks: ['Admission to Comedy Night', 'Admission to Pro-Nite Concert', 'Fest Wristband'],
            description: 'Early bird combination pass saving ₹500 compared to separate tickets.',
          },
          {
            name: 'Phase 2 Full Fest Pass (Save ₹200)',
            price: 2400,
            capacity: 200,
            available: 140,
            phase: 'Phase 2 Combo',
            seatingLevel: 'Both Venues Standard Access',
            perks: ['Full 2-Day Festival Access', 'Comedy Night Entry', 'Concert Pass'],
            description: 'Complete pass for the two headline Aatmatrisha events.',
          },
          {
            name: 'Golden VIP All-Access Bundle',
            price: 3200,
            capacity: 100,
            available: 50,
            phase: 'VIP Gold',
            seatingLevel: 'VIP Orchestra + VIP Concert Pit',
            perks: ['VIP Pit Access for Concert', 'Prime Front Seat for Comedy', 'Fest Merch Kit & Lanyard'],
            description: 'The luxury festival experience with VIP perks across all events.',
          },
        ],
      },

      // 4. Aura AI Hackathon in MRD Building
      {
        title: 'Aura: Generative AI & Autonomous LLM Agents Hackathon',
        description:
          'Organized by Aura (AI Club of PES). A high-intensity 24-hour hackathon building autonomous multi-agent systems and multimodal models. Held in the high-tech MRD Building & PESU 52 labs with high-speed GPU clusters, food, and ₹50,000 cash prize pool.',
        date: addDays(6),
        time: '09:00 AM',
        venue: 'MRD Building (PESU 52 Labs), PES RR Campus',
        capacity: 150,
        availableTickets: 110,
        price: 500,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Solo Developer Pass',
            price: 200,
            capacity: 40,
            available: 30,
            phase: 'Registration',
            seatingLevel: 'MRD 4th Floor Lab Bay A',
            perks: ['Individual Hackathon Entry', 'Free Meals & Midnight RedBull', 'Compute Credits'],
            description: 'Individual participant looking to build or join a team on-site.',
          },
          {
            name: 'Duo Team Track (2 Members)',
            price: 500,
            capacity: 40,
            available: 32,
            phase: 'Team Pass',
            seatingLevel: 'MRD 4th Floor Lab Bay B',
            perks: ['Team of 2 Pass', 'Dedicated Workspace Bench', 'Mentorship Sessions'],
            description: 'Standard 2-member team registration.',
          },
          {
            name: 'Full Squad Pass (4 Members - ₹200/person)',
            price: 800,
            capacity: 70,
            available: 48,
            phase: 'Full Team',
            seatingLevel: 'MRD 5th Floor Central Hub',
            perks: ['Team of 4 Entry', 'Reserved Team Pod', 'Swag Kit for All Members'],
            description: 'Full team pass covering up to 4 student developers.',
          },
        ],
      },

      // 5. GCube Game Jam in PESU 52
      {
        title: 'GCube: 48-Hour Unreal Engine & Unity Game Jam',
        description:
          'Organized by GCube (GameDev Club of PES). Build and deploy complete 2D/3D games based on a mystery theme. Hosted in PESU 52 / MRD Building with dual-monitor workstation access.',
        date: addDays(11),
        time: '04:00 PM',
        venue: 'PESU 52 (High-Performance Computing Center, MRD Building)',
        capacity: 120,
        availableTickets: 85,
        price: 800,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Solo Game Developer',
            price: 250,
            capacity: 40,
            available: 28,
            phase: 'Solo',
            seatingLevel: 'PESU 52 Studio A',
            perks: ['Solo Entry', 'Asset Store Credits', 'Playtest Review'],
            description: 'Solo game developer pass.',
          },
          {
            name: 'Game Studio Team (Up to 4 Members)',
            price: 800,
            capacity: 80,
            available: 57,
            phase: 'Team Pass',
            seatingLevel: 'PESU 52 Studio B & C',
            perks: ['4-Member Studio Pass', 'Dedicated Gaming PC Pod', 'Publisher Showcase Pitch'],
            description: 'Team registration pass for up to 4 members (₹200 per person).',
          },
        ],
      },

      // 6. IEEE Robotics Club in MRD Block
      {
        title: 'IEEE Robotics: RoboWars & Combat Bot Arena',
        description:
          'High-torque combat bots clashing inside the reinforced polycarbonate arena! Autonomous drone obstacle challenges, line followers, and heavy-weight combat categories.',
        date: addDays(14),
        time: '10:00 AM',
        venue: 'MRD Building Mechanical Bay & Quadrangle Arena, PES RR Campus',
        capacity: 160,
        availableTickets: 120,
        price: 1000,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Spectator Pass (Cheer in Arena)',
            price: 100,
            capacity: 60,
            available: 45,
            phase: 'General',
            seatingLevel: 'Arena Viewing Gallery',
            perks: ['Full Day Arena Viewing', 'Safety Glasses Provided'],
            description: 'Watch all matches and drone races.',
          },
          {
            name: 'Bot Duo Registration (2 Members)',
            price: 500,
            capacity: 50,
            available: 38,
            phase: 'Combat Duo',
            seatingLevel: 'Pit Table Bay',
            perks: ['1 Bot Entry', 'Soldering & Power Bench Access'],
            description: 'Combat bot registration for 2 pilots.',
          },
          {
            name: 'Combat Squad Pass (4 Members Team)',
            price: 1000,
            capacity: 50,
            available: 37,
            phase: 'Heavyweight Squad',
            seatingLevel: 'Dedicated Pit Bay & Test Arena',
            perks: ['Entry for 4 Engineers', 'Priority Arena Schedule', 'Trophy Eligibility'],
            description: 'Full team pass for robot combat teams (₹250 per person).',
          },
        ],
      },

      // 7. Equinox Space Club
      {
        title: 'Equinox: CanSat Rocketry & Deep Space Astronomy Night',
        description:
          'Telemetry tracking, CanSat rocket atmospheric launches, and late-night optical telescope stargazing of planetary rings. Organized by Equinox Space Club.',
        date: addDays(8),
        time: '03:30 PM',
        venue: 'PESU 52 & Tech Park Terrace, PES RR Campus',
        capacity: 90,
        availableTickets: 68,
        price: 250,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Astronomy & Stargazing Night Only',
            price: 150,
            capacity: 40,
            available: 30,
            phase: 'Evening Pass',
            seatingLevel: 'Terrace Telescope Deck',
            perks: ['Access to 8-inch Dobsonian Telescopes', 'Astrophotography Session'],
            description: 'Evening stargazing session starting at 7:00 PM.',
          },
          {
            name: 'Full Workshop: Rocketry + CanSat Launch + Stargazing',
            price: 350,
            capacity: 50,
            available: 38,
            phase: 'All-Day Pass',
            seatingLevel: 'PESU 52 Lab & Terrace',
            perks: ['CanSat Electronics Kit Provided', 'Launch Slot', 'Night Astronomy Pass'],
            description: 'Full afternoon rocket build and night stargazing pass.',
          },
        ],
      },

      // 8. E-Cell in GJBC Halls B1 and B2
      {
        title: 'E-Cell: PES E-Summit & Venture Shark Tank 2026',
        description:
          'Annual flagship entrepreneurship summit! Pitch before top VC partners, listen to keynote panels by successful alumni founders, and compete for ₹1 Lakh seed grant.',
        date: addDays(22),
        time: '10:00 AM',
        venue: 'GJBC Halls B1 and B2, PES RR Campus',
        capacity: 250,
        availableTickets: 185,
        price: 500,
        category: 'business',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Student Attendee Delegate',
            price: 299,
            capacity: 150,
            available: 110,
            phase: 'General',
            seatingLevel: 'GJBC Hall B1 Seating',
            perks: ['Full Day Keynote Access', 'Networking Lunch & Delegate Kit'],
            description: 'Standard student pass to all keynote and masterclass sessions.',
          },
          {
            name: 'Founder Pitch Pass (Shark Tank Entry)',
            price: 500,
            capacity: 100,
            available: 75,
            phase: 'Pitch Pass',
            seatingLevel: 'GJBC Hall B2 Investor Chamber',
            perks: ['Pitch Slot to Angels & VCs', '1-on-1 Mentorship', 'Investor Feedback Sheet'],
            description: 'Registration pass for student startup teams pitching for funding.',
          },
        ],
      },

      // 9. Sanskriti & Samarpana at The Opera House (3 Levels)
      {
        title: 'Sanskriti & Samarpana: Classical Indian Arts & Heritage Fest',
        description:
          'Celebration of Indian classical dance, Bharatanatyam, Yakshagana, and instrumental symphonies. Hosted in the 6-floor PES Opera House with multi-level grand auditorium seating.',
        date: addDays(15),
        time: '05:30 PM',
        venue: 'The Opera House (Level 1 Orchestra, Level 2 Mezzanine, Level 3 Balcony)',
        capacity: 1000,
        availableTickets: 820,
        price: 0,
        category: 'arts',
        status: 'published',
        organizer: organizer._id,
        ticketTiers: [
          {
            name: 'Level 1: Orchestra Floor (Prime Front)',
            price: 0,
            capacity: 400,
            available: 310,
            phase: 'Ground Level',
            seatingLevel: 'Level 1 Orchestra (Floors 1–2)',
            perks: ['Closest Stage Proximity', 'Acoustically Optimized Front Seating'],
            description: 'Ground floor orchestra seats with direct view of classical dance.',
          },
          {
            name: 'Level 2: Mezzanine Tier',
            price: 0,
            capacity: 350,
            available: 290,
            phase: 'Middle Tier',
            seatingLevel: 'Level 2 Mezzanine (Floors 3–4)',
            perks: ['Elevated Panoramic View', 'Grand Chandelier Vantage'],
            description: 'Tier 1 seating offering panoramic view of group choreography.',
          },
          {
            name: 'Level 3: Balcony Tier',
            price: 0,
            capacity: 250,
            available: 220,
            phase: 'Upper Tier',
            seatingLevel: 'Level 3 Balcony (Floors 5–6)',
            perks: ['Upper Balcony Vantage', 'Acoustic Soundstage View'],
            description: 'Top balcony seating across the 6-floor Opera House.',
          },
        ],
      },

      // 10. Trance Western Dance Battle in GJBC Hall B1
      {
        title: 'Trance: Inter-College Western Dance Battle & Showcase',
        description:
          'High-energy hip-hop battles, krumping, lyrical duets, and mega-crew choreography judged by celebrity dancers. Held in GJBC Hall B1.',
        date: addDays(9),
        time: '05:00 PM',
        venue: 'GJBC Hall B1 Auditorium, PES RR Campus',
        capacity: 450,
        availableTickets: 310,
        price: 150,
        category: 'arts',
        status: 'published',
        organizer: organizer._id,
      },

      // 11. Music Club Live at Amphitheatre
      {
        title: 'Music Club of PES: Sunset Acoustic Jam & Rock Battle',
        description:
          'Indie rock originals, unplugged acoustic sets, and heavy distortion guitar solos under the open Bangalore sky at the Amphitheatre. Free entry with registration.',
        date: addDays(7),
        time: '05:30 PM',
        venue: 'Open Air Amphitheatre, PES RR Campus',
        capacity: 900,
        availableTickets: 720,
        price: 0,
        category: 'music',
        status: 'published',
        organizer: organizer._id,
      },

      // 12. QForest in GJBC Hall B2
      {
        title: 'QForest: Quantum Computing & Qiskit Hands-on Bootcamp',
        description:
          'Explore qubits, superposition, quantum teleportation, and write quantum code with IBM Qiskit. Hands-on coding session in GJBC Hall B2.',
        date: addDays(13),
        time: '02:00 PM',
        venue: 'GJBC Hall B2, PES RR Campus',
        capacity: 70,
        availableTickets: 52,
        price: 499,
        category: 'tech',
        status: 'published',
        organizer: organizer._id,
      },

      // 13. Hopes Photowalk in Quadrangle
      {
        title: 'Hopes: Campus Lens Photowalk & Golden Hour Shoot',
        description:
          'Capture shadows, architectural lines, and candid student portraits across the Campus Quadrangle. Concludes with a photo print showcase.',
        date: addDays(5),
        time: '04:00 PM',
        venue: 'Main Campus Quadrangle & Central Library Lawn, PES RR Campus',
        capacity: 80,
        availableTickets: 61,
        price: 0,
        category: 'arts',
        status: 'published',
        organizer: organizer._id,
      },

      // 14. MunSoc in GJBC Hall B2
      {
        title: 'MunSoc: PES Model United Nations Crisis Summit 2026',
        description:
          'Intense international diplomacy, UNSC debate, and crisis resolutions simulated over two packed days. Held in GJBC Hall B2 and Seminar Suites.',
        date: addDays(20),
        time: '09:00 AM',
        venue: 'GJBC Hall B2 & Council Chambers, PES RR Campus',
        capacity: 180,
        availableTickets: 135,
        price: 500,
        category: 'other',
        status: 'published',
        organizer: organizer._id,
      },

      // 15. Shunya Math in MRD Building
      {
        title: 'Shunya: Cryptography, Prime Numbers & Mental Math Olympiad',
        description:
          'Fast-paced mental math sprints, cipher decryptions, and mathematical game theory puzzles in the MRD Building.',
        date: addDays(16),
        time: '03:30 PM',
        venue: 'MRD Building Seminar Suite (PESU 52 Wing), PES RR Campus',
        capacity: 150,
        availableTickets: 128,
        price: 100,
        category: 'other',
        status: 'published',
        organizer: organizer._id,
      },
    ];

    await Event.insertMany(demoEvents);
    console.log(`Successfully seeded ${demoEvents.length} authentic PES University events!`);
    mongoose.disconnect();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedDatabase();
