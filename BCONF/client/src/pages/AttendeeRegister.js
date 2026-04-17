import React from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_URL;

const initialForm = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    institution: "",
    pronouns: "",
    allergies: "",
    phone: "",
};

const AttendeeRegister = ({ setUser }) => {
    const [form, setForm] = React.useState(initialForm);
    const [error, setError] = React.useState("");
    const navigate = useNavigate();

    const updateField = (field) => (event) => {
        setForm((current) => ({
            ...current,
            [field]: event.target.value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const res = await axios.post(`${API_BASE}/api/auth/register`, {
                ...form,
                registrationType: "attendee",
            });
            setUser(res.data.user);
            navigate("/");
        } catch (submitError) {
            setError(submitError.response?.data?.message || "Registration failed");
        }
    };

    return (
        <div className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Conference Attendance</p>
                    <h1 className="page-title">Attendee Registration</h1>
                    <p className="page-subtitle">Create an attendee account for conference check-in, updates, and future access. This account does not include paper submission or review permissions.</p>
                </div>
            </section>
            <form className="panel auth-card auth-form" onSubmit={handleSubmit}>
                <h2 className="panel-title">Create Attendee Account</h2>
                {error && <p className="error">{error}</p>}
                <div className="form-grid">
                    <label className="field">
                        <span>First Name <span className="required-indicator">*</span></span>
                        <input type="text" placeholder="First name" value={form.firstName} onChange={updateField("firstName")} required />
                    </label>
                    <label className="field">
                        <span>Last Name <span className="required-indicator">*</span></span>
                        <input type="text" placeholder="Last name" value={form.lastName} onChange={updateField("lastName")} required />
                    </label>
                    <label className="field">
                        <span>Email <span className="required-indicator">*</span></span>
                        <input type="email" placeholder="you@email.com" value={form.email} onChange={updateField("email")} required />
                    </label>
                    <label className="field">
                        <span>Password <span className="required-indicator">*</span></span>
                        <input type="password" placeholder="Create password" value={form.password} onChange={updateField("password")} required />
                    </label>
                    <label className="field">
                        <span>Institution</span>
                        <input type="text" placeholder="Company, school, or organization" value={form.institution} onChange={updateField("institution")} />
                    </label>
                    <label className="field">
                        <span>Pronouns</span>
                        <input type="text" placeholder="Pronouns" value={form.pronouns} onChange={updateField("pronouns")} />
                    </label>
                    <label className="field">
                        <span>Allergies</span>
                        <input type="text" placeholder="Dietary or allergy notes" value={form.allergies} onChange={updateField("allergies")} />
                    </label>
                    <label className="field">
                        <span>Phone</span>
                        <input type="tel" placeholder="Phone number" value={form.phone} onChange={updateField("phone")} />
                    </label>
                </div>
                <button className="btn btn-primary" type="submit">Create Attendee Account</button>
                <p className="required-note"><span className="required-indicator">*</span> indicates a required field.</p>
                <p className="table-meta">Need submission or review access instead? <Link to="/register">Register as a participant</Link>.</p>
            </form>
        </div>
    );
};

export default AttendeeRegister;