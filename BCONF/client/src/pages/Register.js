import React from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

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

const Register = ({ setUser }) => {
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
            const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/register`, form);
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
                    <p className="page-kicker">Participant Accounts</p>
                    <h1 className="page-title">Register</h1>
                    <p className="page-subtitle">Create an account to submit papers, review content, or help manage the conference.</p>
                </div>
            </section>
            <form className="panel auth-card auth-form" onSubmit={handleSubmit}>
                <h2 className="panel-title">Create Participant Account</h2>
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
                        <input type="text" placeholder="University or organization" value={form.institution} onChange={updateField("institution")} />
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
                <button className="btn btn-primary" type="submit">Create Participant Account</button>
                <p className="required-note"><span className="required-indicator">*</span> indicates a required field.</p>
                <p className="table-meta">Attending without paper access? <Link to="/attendee-register">Register as an attendee</Link>.</p>
            </form>
        </div>
    );
};

export default Register;