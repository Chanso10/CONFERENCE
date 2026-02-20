import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = ({setUser}) => {
    const [form, setForm] = React.useState({
        name: "",
        email: "",
        password: "",});
    const [error, setError] = React.useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/auth/register", form);
            setUser(res.data.user);
            navigate("/");
        } catch (error) {
            setError("Registration failed / email may already be in use");
        }
    };



    return <div className="app-shell">
        <section className="page-header">
            <div>
                <p className="page-kicker">Account Setup</p>
                <h1 className="page-title">Register</h1>
                <p className="page-subtitle">Create your account to start submitting papers.</p>
            </div>
        </section>
        <form className="panel auth-card auth-form" onSubmit={handleSubmit}>
            <h2 className="panel-title">Create Account</h2>
            {error && <p className="error">{error}</p>}
            <label className="field">
                <span>Name</span>
                <input type="text" placeholder="Full name" value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}/>
            </label>
            <label className="field">
                <span>Email</span>
                <input type="email" placeholder="you@email.com" value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}/>
            </label>
            <label className="field">
                <span>Password</span>
                <input type="password" placeholder="Create password" value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}/>
            </label>
            <button className="btn btn-primary" type="submit">Register</button>
        </form>
    </div>;
};

export default Register;
