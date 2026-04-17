import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { DEFAULT_WELCOME_CONTENT, normalizeWelcomeContent } from "../utils/welcomeContent";

const API_BASE = process.env.REACT_APP_API_URL;

function Welcome({ user }) {
    const [content, setContent] = useState(DEFAULT_WELCOME_CONTENT);
    const [statusNote, setStatusNote] = useState("");

    useEffect(() => {
        let isMounted = true;

        const loadWelcomeContent = async () => {
            try {
                const res = await axios.get(`${API_BASE}/conference/welcome`);

                if (!isMounted) {
                    return;
                }

                setContent(normalizeWelcomeContent(res.data?.content));
                setStatusNote("");
            } catch (err) {
                if (!isMounted) {
                    return;
                }

                setContent(DEFAULT_WELCOME_CONTENT);
                setStatusNote("Showing placeholder event details until conference information is updated.");
            }
        };

        loadWelcomeContent();

        return () => {
            isMounted = false;
        };
    }, []);

    const quickFacts = [
        { label: "Dates", value: content.event_dates },
        { label: "Location", value: content.location },
        { label: "Format", value: content.format },
        { label: "Venue", value: content.venue },
    ];

    const keyDates = [
        { label: "Submission Deadline", value: content.submission_deadline },
        { label: "Notification Date", value: content.notification_date },
        { label: "Registration Deadline", value: content.registration_deadline },
    ];

    const participationPaths = [
        {
            title: "Authors",
            description: "Submit papers, track review outcomes, and stay current with conference milestones.",
            actionLabel: user ? "Open Portal" : "Create Author Account",
            actionTarget: user ? "/" : "/register",
        },
        {
            title: "Reviewers",
            description: "Coordinate assignments, review submissions, and help shape the conference program.",
            actionLabel: user ? (user.role === "attendee" ? "Open Portal" : "View Papers") : "Sign In",
            actionTarget: user ? (user.role === "attendee" ? "/" : "/papers") : "/login",
        },
        {
            title: "Attendees",
            description: "Register your attendance details and stay ready for conference check-in and updates.",
            actionLabel: user ? "Open Portal" : "Attendee Register",
            actionTarget: user ? "/" : "/attendee-register",
        },
    ];

    const secondaryHeroAction = user
        ? user.role === "attendee"
            ? { label: "Open Portal", target: "/" }
            : { label: "View Papers", target: "/papers" }
        : { label: "Attendee Register", target: "/attendee-register" };

    return (
        <main className="app-shell welcome-shell">
            <section className="panel welcome-hero">
                <div className="welcome-hero-copy">
                    <p className="page-kicker">Conference Information</p>
                    <h1 className="page-title">{content.conference_name}</h1>
                    <p className="welcome-tagline">{content.conference_tagline}</p>
                    <p className="page-subtitle">{content.hero_description}</p>

                    <div className="welcome-hero-actions">
                        <Link className="btn btn-primary" to={user ? "/" : "/register"}>
                            {user ? "Open Portal" : "Register"}
                        </Link>
                        <Link className="btn btn-secondary" to={secondaryHeroAction.target}>
                            {secondaryHeroAction.label}
                        </Link>
                        {!user && (
                            <Link className="btn btn-secondary" to="/login">
                                Login
                            </Link>
                        )}
                    </div>
                </div>

                <div className="welcome-fact-grid" aria-label="Conference quick facts">
                    {quickFacts.map((fact) => (
                        <article className="welcome-fact-card" key={fact.label}>
                            <p className="welcome-fact-label">{fact.label}</p>
                            <p className="welcome-fact-value">{fact.value}</p>
                        </article>
                    ))}
                </div>
            </section>

            {statusNote && <div className="welcome-note">{statusNote}</div>}

            <section className="welcome-section-grid">
                <article className="panel welcome-section">
                    <p className="page-kicker">About The Event</p>
                    <h2 className="panel-title">What BCONF is built for</h2>
                    <p className="welcome-body">{content.overview}</p>
                    <p className="table-meta">Audience: {content.audience}</p>
                </article>

                <article className="panel welcome-section">
                    <p className="page-kicker">Why Attend</p>
                    <h2 className="panel-title">Highlights</h2>
                    <ul className="welcome-list">
                        {content.highlights.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </article>
            </section>

            <section className="panel welcome-section">
                <div className="welcome-section-header">
                    <div>
                        <p className="page-kicker">Key Dates</p>
                        <h2 className="panel-title">Important milestones</h2>
                    </div>
                    <p className="table-meta"></p>
                </div>

                <div className="welcome-card-grid">
                    {keyDates.map((item) => (
                        <article className="welcome-date-card" key={item.label}>
                            <p className="welcome-fact-label">{item.label}</p>
                            <p className="welcome-date-value">{item.value}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="welcome-section-grid">
                <article className="panel welcome-section">
                    <p className="page-kicker">Conference Tracks</p>
                    <h2 className="panel-title">Topics and themes</h2>
                    <ul className="welcome-list">
                        {content.tracks.map((track) => (
                            <li key={track}>{track}</li>
                        ))}
                    </ul>
                </article>

                <article className="panel welcome-section">
                    <p className="page-kicker">Get In Touch</p>
                    <h2 className="panel-title">Contact</h2>
                    <p className="welcome-body">{content.contact_note}</p>
                    <a className="welcome-contact-link" href={`mailto:${content.contact_email}`}>
                        {content.contact_email}
                    </a>
                </article>
            </section>

            <section className="panel welcome-section">
                <div className="welcome-section-header">
                    <div>
                        <p className="page-kicker">How To Join</p>
                        <h2 className="panel-title">Choose the path that fits you</h2>
                    </div>
                </div>

                <div className="welcome-card-grid">
                    {participationPaths.map((path) => (
                        <article className="welcome-path-card" key={path.title}>
                            <h3 className="welcome-card-title">{path.title}</h3>
                            <p className="welcome-body">{path.description}</p>
                            <Link className="btn btn-secondary" to={path.actionTarget}>
                                {path.actionLabel}
                            </Link>
                        </article>
                    ))}
                </div>
            </section>

            <section className="panel welcome-section">
                <div className="welcome-section-header">
                    <div>
                        <p className="page-kicker">FAQ</p>
                        <h2 className="panel-title">Common questions</h2>
                    </div>
                </div>

                <div className="welcome-faq-list">
                    {content.faq_items.map((item) => (
                        <article className="welcome-faq-item" key={item.question}>
                            <h3 className="welcome-card-title">{item.question}</h3>
                            <p className="welcome-body">{item.answer}</p>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}

export default Welcome;
