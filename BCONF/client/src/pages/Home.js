import React from "react";
import { Link } from "react-router-dom";


const Home = ({user, error}) => {
    return (
    <main className="app-shell">
        <section className="page-header">
            <div>
                <p className="page-kicker">Conference Portal</p>
                <h1 className="page-title">Welcome to BCONF</h1>
                <p className="page-subtitle">A single place to submit papers, review content, and manage participants.</p>
            </div>
        </section>
        {error && <div className="error">{error}</div>}
        <section className="panel home-panel">
            {user ? (
                <>
                    <h2 className="panel-title">Welcome back, {user.name}</h2>
                    <p className="page-subtitle">Signed in as {user.email}</p>
                    <div className="auth-actions">
                        <Link to="/papers" className="btn btn-primary">Open Papers</Link>
                        {user.role === "admin" && (
                            <Link to="/users" className="btn btn-secondary">Manage Users</Link>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <h2 className="panel-title">Please log in or register</h2>
                    <p className="page-subtitle">Access your account to submit and review conference papers.</p>
                    <div className="auth-actions">
                        <Link to="/login" className="btn btn-primary">Login</Link>
                        <Link to="/register" className="btn btn-secondary">Register</Link>
                    </div>
                </>
            )}
        </section>
    </main>
    );
};

export default Home;
