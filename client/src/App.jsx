/**
 * App.jsx — Root component with route definitions
 * Configures application routes including the checkout and temporary ticket hold page.
 */
import { Routes, Route, Link } from 'react-router-dom';
import Checkout from './pages/Checkout';

function Home() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#1e293b' }}>
        Event Management System
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 2rem' }}>
        Discover and book tickets for upcoming conferences, workshops, concerts, and meetups.
      </p>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Ticket Checkout and Temporary Hold Routes (FR-04) */}
        <Route path="/checkout/:holdId" element={<Checkout />} />
        <Route path="/checkout" element={<Checkout />} />
      </Routes>
    </div>
  );
}

export default App;
