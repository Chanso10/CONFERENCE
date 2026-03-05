import React, {use, useEffect, useState} from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function PaperList({ user }){
    const [papers, setPapers]=useState([]);
    const [showForm, setShowForm]=useState(false);
    const [title, setTitle]=useState("");
    const [description, setDescription]=useState("");
    const [pdf, setPdf]=useState(null);
    const [error, setError]=useState("");
    const [busyBidPaperId, setBusyBidPaperId] = useState(null);
    const [reviewType, setReviewType] = useState("double_blind");

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

    const loadReviewType = async () => {
        try {
            const res = await axios.get("http://localhost:5000/management/settings/review-type");
            console.log("Loaded review type:", res.data.review_type);
            setReviewType(res.data.review_type);
        } catch (err) {
            console.error("Failed to load review type:", err);
            setReviewType("double_blind");
        }
    };

    useEffect(() => {
        loadPapers();
        loadReviewType();
    }, []);

    const showAuthor = (paper) => {
        if (user.role === "admin" || user.role === "deputy") {
            return true;
        }
        if(user.role === "reviewer") {
            if (reviewType === "single_blind" || reviewType === "open") {
                return true;
            }
        }

        return paper.author_id === user.id;
    };


    const submitPaper= async e=>{
        e.preventDefault();
        const formData=new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("pdf", pdf);

        try {
            await axios.post("http://localhost:5000/papers", formData);
            await loadPapers();
            setShowForm(false);
            setTitle("");
            setDescription("");
            setPdf(null);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit paper");
        }
    };

    const addBid = async (paperId) => {
        setBusyBidPaperId(paperId);
        try {
            await axios.post(`http://localhost:5000/papers/${paperId}/bid`);
            await loadPapers();
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to place bid");
        } finally {
            setBusyBidPaperId(null);
        }
    };

    const removeBid = async (paperId) => {
        setBusyBidPaperId(paperId);
        try {
            await axios.delete(`http://localhost:5000/papers/${paperId}/bid`);
            await loadPapers();
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove bid");
        } finally {
            setBusyBidPaperId(null);
        }
    };

    const isReviewer = user.role === "reviewer";
    const canViewPaper = (paper) => {
        if (user.role === "reviewer") {
            return Boolean(paper.is_assigned || paper.is_authored_by_me);
        }
        return user.role === "admin" || user.role === "deputy" || paper.author_id === user.id;
    };

    const reviewerStatus = (paper) => {
        if (paper.is_assigned) {
            if (paper.anti_bid) {
                return "Assigned (Anti-bid submitted)";
            }
            return "Assigned";
        }
        if (paper.bid_locked) {
            return "Bid locked";
        }
        if (paper.has_bid) {
            return "Interested";
        }
        if (paper.is_authored_by_me) {
            return "Authored by you";
        }
        return "Unassigned";
    };

    return(
        <main className="app-shell">
            {error && <div className="error">{error}</div>}
            <section className="page-header">
                <div>
                    <p className="page-kicker">Conference Portal</p>
                    <h1 className="page-title">Paper Submissions</h1>
                    <p className="page-subtitle">Track, review, and access submitted papers.</p>
                </div>
                <button className="btn btn-primary" onClick={()=> setShowForm(!showForm)} disabled={isReviewer}>
                    {showForm ? "Close Form" : "Submit New Paper"}
                </button>
            </section>

            {showForm && !isReviewer && (
                <form className="panel paper-form" onSubmit={submitPaper}>
                    <h2 className="panel-title">New Submission</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>Title</span>
                            <input type="text" placeholder="Paper title" value={title} onChange={e=> setTitle(e.target.value)} required/>
                        </label>
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
                                <th>Title</th>
                                {(reviewType !== "double_blind" || !isReviewer) && <th>Author</th>}
                                <th>Description</th>
                                {isReviewer && <th>Status</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {papers.length === 0 && (
                                <tr>
                                    <td className="empty-state" colSpan={isReviewer ? (reviewType === "double_blind" ? 4 : 5) : 4}>No papers submitted yet.</td>
                                </tr>
                            )}
                            {papers.map((p)=>(
                                <tr key={p.paper_id}>
                                    <td className="author-cell">{p.title || "Untitled Paper"}</td>
                                    {showAuthor(p) && <td className="author-cell">{p.author}</td>}
                                    <td>{p.description}</td>
                                    {isReviewer && <td>{reviewerStatus(p)}</td>}
                                    <td>
                                        {canViewPaper(p) && (
                                            <Link className="btn btn-secondary" to={`/papers/${p.paper_id}`}>View Paper</Link>
                                        )}
                                        {isReviewer && !p.is_assigned && !p.is_authored_by_me && !p.has_bid && (
                                            <button
                                                className="btn btn-primary"
                                                type="button"
                                                onClick={() => addBid(p.paper_id)}
                                                disabled={busyBidPaperId === p.paper_id}
                                            >
                                                Bid Interested
                                            </button>
                                        )}
                                        {isReviewer && !p.is_assigned && p.has_bid && !p.bid_locked && (
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                onClick={() => removeBid(p.paper_id)}
                                                disabled={busyBidPaperId === p.paper_id}
                                            >
                                                Remove Bid
                                            </button>
                                        )}
                                        
                                        {isReviewer && p.bid_locked && !p.is_assigned && (
                                            <span className="table-meta">Bid locked</span>
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
