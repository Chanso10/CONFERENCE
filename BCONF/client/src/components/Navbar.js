import React from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Navbar = ({ user, setUser }) => {
    const navigate = useNavigate();
    const canAccessPapers = !user || user.role !== "attendee";

    const handleLogout = async () => {
        await axios.post("http://localhost:5000/api/auth/logout");
        setUser(null);
        navigate("/");
    };

    const handleLogin = () => {
        navigate("/login");
    };

    const handleRegister = () => {
        navigate("/register");
    };

    const handleAttendeeRegister = () => {
        navigate("/attendee-register");
    };

    return (
        <header className="top-nav-wrap">
            <nav className="top-nav">
                <Link to="/" className="brand">BCONF</Link>
                <div className="nav-links">
                    <Link to="/" className="nav-link">Home</Link>
                    {canAccessPapers && <Link to="/papers" className="nav-link">Papers</Link>}
                    {user && (user.role === "admin" || user.role === "deputy") && (
                        <Link to="/management" className="nav-link">Manage Reviews</Link>
                    )}
                    {user && user.role === "admin" && (
                        <Link to="/users" className="nav-link">Manage Users</Link>
                    )}
                </div>
                <div className="nav-actions">
                    {user ? (
                        <>
                            <span className="user-pill">{user.name}</span>
                            <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-secondary" onClick={handleLogin}>Login</button>
                            <button className="btn btn-primary" onClick={handleRegister}>Register</button>
                            <button className="btn btn-secondary" onClick={handleAttendeeRegister}>Attendee Register</button>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Navbar;