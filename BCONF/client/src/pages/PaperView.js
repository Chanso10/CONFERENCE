import React, {useEffect, useState} from "react";
import {useParams, Link} from "react-router-dom";
import axios from "axios";

function PaperView({ user }){
    const {id}=useParams();
    const [paper, setPaper]=useState(null);
    const [error, setError]=useState("");
    const [ratings, setRatings]=useState([]);
    const [newRating, setNewRating]=useState("");

    useEffect(()=>{
        const loadPaper=async()=>{
            try {
                const res=await axios.get(`http://localhost:5000/papers/${id}`);
                setPaper(res.data);
                setError("");
            } catch (err) {
                setError("Failed to load paper or access denied");
                setPaper(null);
            }
        }

        const loadRatings=async()=>{
            try {
                const res=await axios.get(`http://localhost:5000/papers/${id}/ratings`);
                setRatings(res.data);
            } catch (err) {
                // If can't load ratings, just don't show them
            }
        }

        loadPaper();
        loadRatings();
    },[id]);

    const submitRating = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`http://localhost:5000/papers/${id}/ratings`, { rating: parseInt(newRating) });
            const res = await axios.get(`http://localhost:5000/papers/${id}/ratings`);
            setRatings(res.data);
            setNewRating("");
        } catch (err) {
            setError("Failed to submit rating");
        }
    };

    if(error) return <main className="app-shell"><div className="error">{error}</div></main>;
    if(!paper) return <main className="app-shell"><section className="panel loading-panel">Loading...</section></main>;

    return(
        <main className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Paper Detail</p>
                    <h1 className="page-title">Review Submission</h1>
                </div>
                <Link className="btn btn-secondary" to ="/papers">Back to List</Link>
            </section>

            <section className="paper-view-layout">
                <aside className="panel">
                    <h2 className="panel-title">{paper.author}</h2>
                    <p className="paper-description">{paper.description}</p>
                    {user && user.role === 'reviewer' && (
                        <form onSubmit={submitRating} className="rating-form">
                            <label className="field">
                                <span>Rating (1-5)</span>
                                <select className="role-select" value={newRating} onChange={e => setNewRating(e.target.value)} required>
                                    <option value="">Select</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                    <option value="5">5</option>
                                </select>
                            </label>
                            <button type="submit" className="btn btn-primary">Submit Rating</button>
                        </form>
                    )}
                </aside>

                <article className="panel pdf-panel">
                    <iframe
                        src={`http://localhost:5000/${paper.pdf_path}`}
                        title="paper-pdf"
                    />
                </article>
            </section>

            {ratings.length > 0 && (
                <section className="panel">
                    <div className="table-head">
                        <h2 className="panel-title">Reviews</h2>
                    </div>
                    <div className="review-list">
                    {ratings.map(r => (
                        <div key={r.id} className="review">
                            Reviewer {r.editor_id}: Rating {r.rating}/5
                        </div>
                    ))}
                    </div>
                </section>
            )}
        </main>
    );
}

export default PaperView;
