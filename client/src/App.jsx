/**
 * App.jsx — Root component with route definitions
 * Feature branches will add their specific routes here.
 */
import { Routes, Route } from 'react-router-dom';
import ContactForm from './components/ContactForm.jsx';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<h1>Event Management System</h1>} />
        <Route path="/checkout/contact" element={<ContactForm />} />
        <Route path="/checkout/:ticketId/contact" element={<ContactForm />} />
        {/* Feature routes will be added by feature branches */}
      </Routes>
    </div>
  );
}

export default App;
