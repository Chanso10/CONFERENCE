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
        <form className="login-form" onSubmit={handleSubmit}>
            <h2>Register</h2>
            {error && <p className="error">{error}</p>}
             <input type="text" placeholder="name" className="border p-2 w-full mb-3" value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}/>
            <input type="email" placeholder="email" className="border p-2 w-full mb-3" value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}/>
            <input type="password" placeholder="password" className="border p-2 w-full mb-3" value={form.password}
            onChange={(e) => setForm({...form, password: e.target.value})}/>
            <button className="btn btn-primary">Register</button>
        </form>
    </div>;
};

export default Register;