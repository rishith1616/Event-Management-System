/**
 * App.jsx — Root component with route definitions and global context
 * Configures authentication state provider, navigation bar, footer, and role-protected routes.
 */
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AttendeeDashboard from './pages/AttendeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateEvent from './pages/CreateEvent';
import MyEvents from './pages/MyEvents';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import ContactForm from './components/ContactForm';
import Payment from './pages/Payment';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Navbar />
        <main className="main-content-flow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* FR-04 & FR-05 Checkout Flow */}
            <Route path="/checkout/:holdId" element={<Checkout />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/contact" element={<ContactForm />} />
            <Route path="/checkout/:ticketId/contact" element={<ContactForm />} />

            {/* FR-06 Payment Processing Route */}
            <Route path="/payment/:holdId" element={<Payment />} />

            {/* Student Profile & Pass Wallet */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* Role-Specific Dashboards */}
            <Route
              path="/dashboard/organizer"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/attendee"
              element={
                <ProtectedRoute roles={['attendee']}>
                  <AttendeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* FR-02 Organizer Event Management */}
            <Route
              path="/events/create"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/edit/:id"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/my-events"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <MyEvents />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Home />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
