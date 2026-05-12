import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Governance from './pages/Governance';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import UserProfile from './pages/UserProfile';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/user/:address" element={<UserProfile />} />
          <Route path="/governance" element={<Governance />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/messages" element={<Messages />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

