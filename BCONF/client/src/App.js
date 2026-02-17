import { Fragment, useEffect, useState } from "react";
import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import PaperList from "./pages/PaperList";
import PaperView from "./pages/PaperView";
import ListPapers from "./components/ListPapers";
import Navbar from "./components/Navbar";
import NotFound from "./components/NotFound";
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
    return <div>Loading...</div>;
  }


  return (
    <Router>
      <Navbar user={user} setUser={setUser}/>
      <Routes>
        <Route path="/" element={<Home user={user} error={error}/>} />
        <Route path="/login" element={user ? <Navigate to="/"/> : <Login setUser={setUser}/>} />
        <Route path="/register" element={user ? <Navigate to="/"/> : <Register setUser={setUser}/>} />
        <Route path="/papers" element={<PaperList />} />
        <Route path="/papers/:id" element={<PaperView />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
