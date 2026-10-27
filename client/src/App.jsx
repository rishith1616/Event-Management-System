/**
 * App.jsx — Root component with route definitions
 * Feature branches add their specific routes here.
 */
import { Routes, Route, Link } from 'react-router-dom';
import Payment from './pages/Payment';

// Demo landing page for quick feature navigation
const Home = () => (
  <div className="container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
    <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem', color: '#1f2937' }}>
      Event Management System
    </h1>
    <p style={{ color: '#6b7280', maxWidth: '550px', margin: '0 auto 2rem' }}>
      Welcome to the Event Management System. Use the checkout link below to test the payment processing and ticket issuance flow.
    </p>
    <div>
      <Link to="/payment/demo-hold-123" className="btn btn-primary">
        Test Payment Checkout Flow
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/payment/:holdId" element={<Payment />} />
      </Routes>
    </div>
  );
}

export default App;
