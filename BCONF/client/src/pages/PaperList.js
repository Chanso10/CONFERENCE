import React, {useEffect, useState} from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function PaperList({ user }){
    const [papers, setPapers]=useState([]);
    const [showForm, setShowForm]=useState(false);
    const [description, setDescription]=useState("");
    const [pdf, setPdf]=useState(null);
    const [error, setError]=useState("");

    const  loadPapers= async()=>{
        try {
            const res = await axios.get("http://localhost:5000/papers");
            setPapers(res.data);
            setError("");
        } catch (err) {
            setError("Failed to load papers");
            setPapers([]);
        }
    };

    useEffect(()=>{
        loadPapers();
    },[]);

    const submitPaper= async e=>{
        e.preventDefault();
        const formData=new FormData();
        formData.append("description", description);
        formData.append("pdf", pdf);

        try {
            await axios.post("http://localhost:5000/papers", formData);
            await loadPapers();
            setShowForm(false);
            setDescription("");
            setPdf(null);
        } catch (err) {
            setError("Failed to submit paper");
        }
    };
    return(
        <main className="app-shell">
            {error && <div className="error">{error}</div>}
            <section className="page-header">
                <div>
                    <p className="page-kicker">Conference Portal</p>
                    <h1 className="page-title">Paper Submissions</h1>
                    <p className="page-subtitle">Track, review, and access submitted papers from one clean workspace.</p>
                </div>
                <button className="btn btn-primary" onClick={()=> setShowForm(!showForm)} disabled={user.role === 'reviewer'}>
                    {showForm ? "Close Form" : "Submit New Paper"}
                </button>
            </section>

            {showForm && user.role !== 'reviewer' && (
                <form className="panel paper-form" onSubmit={submitPaper}>
                    <h2 className="panel-title">New Submission</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>Description</span>
                            <input type="text" placeholder="Paper summary" value={description} onChange={e=> setDescription(e.target.value)} required/>
                        </label>
                        <label className="field">
                            <span>PDF</span>
                            <input type="file" onChange={e=> setPdf(e.target.files[0])} accept="application/pdf" required/>
                        </label>
                    </div>
                    <div className="form-actions">
                        <button className="btn btn-primary" type="submit">Upload Paper</button>
                    </div>
                </form>
            )}

            <section className="panel table-panel">
                <div className="table-head">
                    <h2 className="panel-title">Submitted Papers</h2>
                    <p className="table-meta">{papers.length} total</p>
                </div>
                <div className="table-wrap">
                    <table className="paper-table">
                        <thead>
                            <tr>
                                <th>Author</th>
                                <th>Description</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {papers.length === 0 && (
                                <tr>
                                    <td className="empty-state" colSpan="3">No papers submitted yet.</td>
                                </tr>
                            )}
                            {papers.map((p)=>(
                                <tr key={p.paper_id}>
                                    <td className="author-cell">{p.author}</td>
                                    <td>{p.description}</td>
                                    <td>
                                        {(user.role === 'admin' || user.role === 'reviewer' || p.author_id === user.id) && (
                                            <Link className="btn btn-secondary" to={`/papers/${p.paper_id}`}>View Paper</Link>
                                        )}
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

export default PaperList;
