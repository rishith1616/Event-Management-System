/**
 * App.jsx — Root component with route definitions
 * Configures routes for event browsing and details.
 */
import { Routes, Route } from 'react-router-dom';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/events" element={<EventList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        {/* Feature routes will be added by feature branches */}
      </Routes>
    </div>
  );
}

export default App;
