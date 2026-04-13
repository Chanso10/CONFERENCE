import React from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Navbar = ({user, setUser}) => {
    const navigate = useNavigate();

    const handleLogout = async() => {
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

    return (
        <header className="top-nav-wrap">
            <nav className="top-nav">
                <Link to="/" className="brand">BCONF</Link>
                <div className="nav-links">
                    <Link to="/" className="nav-link">Home</Link>
                    <Link to="/papers" className="nav-link">Papers</Link>
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
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
