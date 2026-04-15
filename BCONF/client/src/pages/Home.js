import React from "react";
import { Link } from "react-router-dom";

const Home = ({ user, error }) => {
    const isChair = user && (user.role === "admin" || user.role === "deputy");
    const isAttendee = user && user.role === "attendee";
    const canAccessPapers = user && !isAttendee;

    return (
        <main className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Conference Portal</p>
                    <h1 className="page-title">Welcome to BCONF</h1>
                    <p className="page-subtitle">A single place to submit papers, review content, manage participants, and keep attendee records on file.</p>
                </div>
            </section>
            {error && <div className="error">{error}</div>}
            <section className="panel home-panel">
                {user ? (
                    <>
                        <h2 className="panel-title">Welcome back, {user.name}</h2>
                        <p className="page-subtitle">Signed in as {user.email}</p>
                        {isAttendee ? (
                            <p className="page-subtitle">Your attendee account is ready for conference check-in and future sign-ins.</p>
                        ) : (
                            <p className="page-subtitle">Use your account to manage submissions, review assignments, and conference activity.</p>
                        )}
                        <div className="auth-actions">
                            {canAccessPapers && <Link to="/papers" className="btn btn-primary">Open Papers</Link>}
                            {isChair && <Link to="/management" className="btn btn-secondary">Manage Reviews</Link>}
                            {user.role === "admin" && <Link to="/users" className="btn btn-secondary">Manage Users</Link>}
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="panel-title">Choose your registration path</h2>
                        <p className="page-subtitle">Register as a paper participant if you need submission or review access, or as an attendee if you only need conference attendance details on file.</p>
                        <div className="auth-actions">
                            <Link to="/login" className="btn btn-primary">Login</Link>
                            <Link to="/register" className="btn btn-secondary">Register</Link>
                            <Link to="/attendee-register" className="btn btn-secondary">Attendee Register</Link>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
};

export default Home;