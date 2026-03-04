import React from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Login = ({setUser}) => {
    const [form, setForm] = React.useState({
    email: "",
    password: "",});
    const [error, setError] = React.useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post("http://localhost:5000/api/auth/login", form);
            setUser(res.data.user);
            navigate("/");
        } catch (error) {
            setError(error.response?.data?.message || "Login failed");
        }
    };



    return <div className="app-shell">
        <section className="page-header">
            <div>
                <p className="page-kicker">Account Access</p>
                <h1 className="page-title">Login</h1>
                <p className="page-subtitle">Sign in to access your conference workspace.</p>
            </div>
        </section>
        <form className="panel auth-card auth-form" onSubmit={handleSubmit}>
            <h2 className="panel-title">Welcome Back</h2>
            {error && <p className="error">{error}</p>}
            <label className="field">
                <span>Email</span>
                <input type="email" placeholder="you@email.com" value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}/>
            </label>
            <label className="field">
                <span>Password</span>
                <input type="password" placeholder="Enter password" value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}/>
            </label>
            <button className="btn btn-primary" type="submit">Login</button>
        </form>
    </div>;
};

export default Login;
