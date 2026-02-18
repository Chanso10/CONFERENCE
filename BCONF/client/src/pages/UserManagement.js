import React, { useEffect, useState } from "react";
import axios from "axios";

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState("");

    const loadUsers = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/auth/users");
            setUsers(res.data);
            setError("");
        } catch (err) {
            setError("Failed to load users");
            setUsers([]);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const updateRole = async (id, newRole) => {
        try {
            await axios.put(`http://localhost:5000/api/auth/users/${id}/role`, { role: newRole });
            loadUsers(); // Reload to show updated roles
        } catch (err) {
            setError("Failed to update role");
        }
    };

    return (
        <main className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Admin Panel</p>
                    <h1 className="page-title">User Management</h1>
                    <p className="page-subtitle">Manage user roles and permissions.</p>
                </div>
            </section>
            {error && <div className="error">{error}</div>}
            <section className="panel table-panel">
                <div className="table-head">
                    <h2 className="panel-title">Registered Users</h2>
                    <p className="table-meta">{users.length} total</p>
                </div>
                <div className="table-wrap">
                    <table className="user-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 && (
                                <tr>
                                    <td className="empty-state" colSpan="4">No users found.</td>
                                </tr>
                            )}
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>
                                        <select
                                            value={u.role}
                                            onChange={(e) => updateRole(u.id, e.target.value)}
                                        >
                                            <option value="author">Author</option>
                                            <option value="admin">Admin</option>
                                            <option value="editor">Editor</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

export default UserManagement;