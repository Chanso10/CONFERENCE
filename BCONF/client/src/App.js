import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PaperList from "./pages/PaperList";
import PaperView from "./pages/PaperView";
import Navbar from "./components/Navbar";
import NotFound from "./components/NotFound";
import UserManagement from "./pages/UserManagement";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AttendeeRegister from "./pages/AttendeeRegister";
import ReviewManagement from "./pages/ReviewManagement";
import axios from "axios";

axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [error] = useState("");
  const [loading, setLoading] = useState(true);

  const isChair = user && (user.role === "admin" || user.role === "deputy");
  const canAccessPapers = user && ["author", "reviewer", "admin", "deputy"].includes(user.role);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/me");
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return <main className="app-shell"><section className="panel loading-panel">Loading...</section></main>;
  }

  return (
    <Router>
      <Navbar user={user} setUser={setUser} />
      <Routes>
        <Route path="/" element={<Home user={user} error={error} />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login setUser={setUser} />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register setUser={setUser} />} />
        <Route path="/attendee-register" element={user ? <Navigate to="/" /> : <AttendeeRegister setUser={setUser} />} />
        <Route
          path="/papers"
          element={
            canAccessPapers
              ? <PaperList user={user} />
              : user
                ? <Navigate to="/" />
                : <Navigate to="/login" />
          }
        />
        <Route
          path="/papers/:id"
          element={
            canAccessPapers
              ? <PaperView user={user} />
              : user
                ? <Navigate to="/" />
                : <Navigate to="/login" />
          }
        />
        <Route path="/management" element={isChair ? <ReviewManagement /> : <Navigate to="/" />} />
        <Route path="/users" element={user && user.role === "admin" ? <UserManagement /> : <Navigate to="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;