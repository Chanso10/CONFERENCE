import React from "react";
import { Link } from "react-router-dom";


const Home = ({user, error}) => {
    return (
    <div>
        {error && <p className="error">{error}</p>}
        {user ? (
            <div>
                <h2>Welcome, {user.name}!</h2>
                <p>You are logged in as {user.email}.</p>
            </div>
        ) : (
            <div>
                <h2>Please log in or register</h2>
                <div>
                    <Link to="/login" className="btn btn-primary mr-2">Login</Link>
                    <Link to="/register" className="btn btn-secondary">Register</Link>
                </div>
            </div>
        )}
    </div>
    );
};

export default Home;