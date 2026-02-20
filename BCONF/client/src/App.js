import { useEffect, useState } from "react";
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PaperList from "./pages/PaperList";
import PaperView from "./pages/PaperView";
import Navbar from "./components/Navbar";
import NotFound from "./components/NotFound";
import UserManagement from "./pages/UserManagement";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import axios from "axios";

axios.defaults.withCredentials = true; 

// components
function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [ loading, setLoading] = useState(true);

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
    }
    fetchUser();
  }, []);

  if (loading) {
    return <main className="app-shell"><section className="panel loading-panel">Loading...</section></main>;
  }


  return (
    <Router>
      <Navbar user={user} setUser={setUser}/>
      <Routes>
        <Route path="/" element={<Home user={user} error={error}/>} />
        <Route path="/login" element={user ? <Navigate to="/"/> : <Login setUser={setUser}/>} />
        <Route path="/register" element={user ? <Navigate to="/"/> : <Register setUser={setUser}/>} />
        <Route path="/papers" element={user ? <PaperList user={user} /> : <Navigate to="/login" />} />
        <Route path="/papers/:id" element={user ? <PaperView user={user} /> : <Navigate to="/login" />} />
        <Route path="/users" element={user && user.role === 'admin' ? <UserManagement /> : <Navigate to="/" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
