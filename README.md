# Event Management System

A full-stack event management platform built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

- **User Role Management** — Register as Organizer, Attendee, or Admin with role-based dashboards
- **Event Creation & Publishing** — Organizers create, edit, and publish events
- **Event Browsing & Filtering** — Attendees search and filter active events
- **Ticket Checkout Flow** — Temporary holds, contact validation, and payment processing
- **Admin Moderation** — Platform admins can suspend events and organizer accounts
- **ACID-Compliant Transactions** — MongoDB transactions ensure data integrity
- **Loosely Coupled Payment API** — Strategy pattern for swappable payment providers

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Frontend   | React 18, Vite, React Router |
| Backend    | Express.js, Node.js          |
| Database   | MongoDB with Mongoose ODM    |
| Auth       | JWT + bcrypt                  |

## Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)

### Installation

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Configuration

Copy `server/.env.example` to `server/.env` and update values:

```
MONGO_URI=mongodb://localhost:27017/event-management
JWT_SECRET=your-secret-key
PORT=5000
```

### Running

```bash
# Start backend (from server/)
npm run dev

# Start frontend (from client/)
npm run dev
```

## Project Structure

```
├── server/              # Express.js backend
│   ├── config/          # Database configuration
│   ├── controllers/     # Route handlers
│   ├── middleware/       # Auth, validation, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   └── server.js        # Entry point
├── client/              # React frontend
│   ├── public/
│   └── src/
│       ├── components/  # Reusable UI components
│       ├── pages/       # Page-level components
│       ├── context/     # React context providers
│       └── services/    # API service layer
└── documents/           # Project documentation
```

## Team

- **rishith1616** — Project Lead
- **JayanthKumarP88** — Developer
- **KartikNaik6** — Developer
