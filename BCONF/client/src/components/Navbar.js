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

    return <nav className="">
        <Link to="/" >Home</Link>
        <div>{user ? (
            <button onClick={handleLogout}>Logout</button>
        ) : (
            <><button onClick={handleLogin}>Login</button>
            <button onClick={handleRegister}>Register</button>
            </>

        )}</div>
        <Link to="/papers">Papers</Link>
        
    </nav>;
};

export default Navbar;