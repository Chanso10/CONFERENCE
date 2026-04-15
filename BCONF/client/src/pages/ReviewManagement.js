import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL;

function ReviewManagement() {
    const [papers, setPapers] = useState([]);
    const [reviewers, setReviewers] = useState([]);
    const [selectionByPaper, setSelectionByPaper] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busyKey, setBusyKey] = useState("");
    const [reviewType, setReviewType] = useState("double_blind");
    const [directionsText, setDirectionsText] = useState("");
    const [directionsEditing, setDirectionsEditing] = useState(false);
    const [directionsSaving, setDirectionsSaving] = useState(false);

    const reviewTypeLabels = {
        single_blind: "Single Blind",
        double_blind: "Double Blind",
        open: "Open",
    };

    const loadData = useCallback(async () => {
        try {
            const [papersRes, reviewersRes] = await Promise.all([
                axios.get(`${API_BASE}/management/papers`),
                axios.get(`${API_BASE}/management/reviewers`),
            ]);
            setPapers(papersRes.data);
            setReviewers(reviewersRes.data);
            setError("");
        } catch (err) {
            setError("Failed to load review management data");
            setPapers([]);
            setReviewers([]);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        try {
            const [reviewTypeRes, directionsRes] = await Promise.all([
                axios.get(`${API_BASE}/management/settings/review-type`),
                axios.get(`${API_BASE}/management/settings/review-directions`),
            ]);
            setReviewType(reviewTypeRes.data.review_type);
            if (directionsRes.data.directions) {
                setDirectionsText(directionsRes.data.directions);
            }
        } catch (err) {
            setError("Failed to load settings");
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadData();
            setLoading(false);
        };
        init();
    }, [loadData]);

    useEffect(() => {
        const init = async () => {
            await loadSettings();
        };
        init();
    }, [loadSettings]);

    const handleReviewTypeChange = async (newType) => {
        if (newType === reviewType) {
            return;
        }

        const currentLabel = reviewTypeLabels[reviewType] || reviewType;
        const nextLabel = reviewTypeLabels[newType] || newType;
        const confirmed = window.confirm(
            `Change review type from ${currentLabel} to ${nextLabel}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            await axios.put(`${API_BASE}/management/settings/review-type`, { review_type: newType });
            setReviewType(newType);
            setError("");
        } catch (err) {
            setError("Failed to update review type settings");
        }
    };

    const handleAssign = async (paperId) => {
        const reviewerId = Number.parseInt(selectionByPaper[paperId], 10);
        if (!reviewerId) {
            setError("Select a reviewer before assigning.");
            return;
        }

        const key = `assign-${paperId}-${reviewerId}`;
        setBusyKey(key);
        try {
            await axios.post(`${API_BASE}/management/papers/${paperId}/assignments`, { reviewerId });
            await loadData();
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to assign reviewer");
        } finally {
            setBusyKey("");
        }
    };

    const handleUnassign = async (paperId, reviewerId) => {
        const key = `unassign-${paperId}-${reviewerId}`;
        setBusyKey(key);
        try {
            await axios.delete(`${API_BASE}/management/papers/${paperId}/assignments/${reviewerId}`);
            await loadData();
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to unassign reviewer");
        } finally {
            setBusyKey("");
        }
    };

    const handleSaveDirections = async () => {
        const text = directionsText.trim();
        if (!text) {
            setError("Directions cannot be empty");
            return;
        }

        setDirectionsSaving(true);
        try {
            await axios.put(`${API_BASE}/management/settings/review-directions`, { directions: text });
            setDirectionsEditing(false);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save directions");
        } finally {
            setDirectionsSaving(false);
        }
    };

    const handleDeleteDirections = async () => {
        if (!window.confirm("Delete review directions for all papers?")) {
            return;
        }

        setDirectionsSaving(true);
        try {
            await axios.delete(`${API_BASE}/management/settings/review-directions`);
            setDirectionsText("");
            setDirectionsEditing(false);
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete directions");
        } finally {
            setDirectionsSaving(false);
        }
    };

    const reviewerOptionsByPaper = useMemo(() => {
        const result = {};
        for (const paper of papers) {
            const assignedIds = new Set(paper.assignments.map((entry) => entry.reviewer_id));
            result[paper.paper_id] = reviewers.filter(
                (reviewer) => !assignedIds.has(reviewer.id) && reviewer.id !== paper.author_id
            );
        }
        return result;
    }, [papers, reviewers]);

    if (loading) {
        return (
            <main className="app-shell">
                <section className="panel loading-panel">Loading...</section>
            </main>
        );
    }

    return (
        <main className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Chair Panel</p>
                    <h1 className="page-title">Review Management</h1>
                    <p className="page-subtitle">Assign reviewers, inspect bids and anti-bids, and view best paper votes.</p>
                </div>
            </section>
            <div>
                <label>
                Review Type: </label>
                <select style={{ maxWidth: '150px', width: '100%' }}
                    value={reviewType}
                    onChange={(e) => handleReviewTypeChange(e.target.value)}
                >
                <option value="single_blind">Single Blind</option>
                <option value="double_blind">Double Blind</option>
                <option value="open">Open</option>
            </select>
            </div>

            {error && <div className="error">{error}</div>}

            <section className="panel" style={{marginBottom:'20px'}}>
                <div className="table-head">
                    <h2 className="panel-title">Review Directions for All Papers</h2>
                </div>
                
                {directionsEditing ? (
                    <div style={{padding:'15px'}}>
                        <textarea
                            rows="4"
                            value={directionsText}
                            onChange={(e) => setDirectionsText(e.target.value)}
                            placeholder="Enter directions for reviewers to follow when reviewing any paper..."
                            style={{ width: '100%', padding: '8px', fontFamily: 'monospace', marginBottom: '8px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveDirections}
                                disabled={directionsSaving}
                            >
                                {directionsSaving ? "Saving..." : "Save Directions"}
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setDirectionsEditing(false)}
                                disabled={directionsSaving}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{padding:'15px'}}>
                        {directionsText ? (
                            <div>
                                <p style={{ whiteSpace: 'pre-wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '10px', backgroundColor: 'white', borderRadius: '4px', marginBottom:'10px' }}>
                                    {directionsText}
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => setDirectionsEditing(true)}
                                    >
                                        Edit Directions
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={handleDeleteDirections}
                                        disabled={directionsSaving}
                                    >
                                        Delete Directions
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p style={{ fontStyle: 'italic', color: '#999', marginBottom:'10px' }}>No directions set yet.</p>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => {
                                        setDirectionsEditing(true);
                                        setDirectionsText("");
                                    }}
                                >
                                    Add Directions
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {papers.map((paper) => (
                <section className="panel table-panel" key={paper.paper_id}>
                    <div className="table-head">
                        <h2 className="panel-title">{paper.title || "Untitled Paper"}</h2>
                        <p className="table-meta">Paper #{paper.paper_id}</p>
                    </div>
                    <div style={{marginLeft:'10px'}}>
                    <p className="page-subtitle">{paper.description}</p>
                    <p className="table-meta">Author: {paper.author}</p>
                    </div>
                    <div className="form-grid" style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                        <label className="field">
                            <h3 style={{marginLeft:'10px'}}>Assign Reviewer</h3>
                            <select
                                className="role-select"
                                value={selectionByPaper[paper.paper_id] || ""}
                                onChange={(e) =>
                                    setSelectionByPaper((prev) => ({
                                        ...prev,
                                        [paper.paper_id]: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Select reviewer</option>
                                {reviewerOptionsByPaper[paper.paper_id].map((reviewer) => (
                                    <option value={reviewer.id} key={reviewer.id}>
                                        {reviewer.name} ({reviewer.email})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button style={{height:'45px'}}
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleAssign(paper.paper_id)}
                            disabled={busyKey.startsWith(`assign-${paper.paper_id}-`)}
                        >
                            Assign Reviewer
                        </button>
                    </div>

                    <div className="table-wrap">
                        <table className="paper-table">
                            <thead>
                                <tr>
                                    <th>Assigned Reviewers</th>
                                    <th>Anti-Bid</th>
                                    <th>Reason</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paper.assignments.length === 0 && (
                                    <tr>
                                        <td className="empty-state" colSpan="4">
                                            No assigned reviewers.
                                        </td>
                                    </tr>
                                )}
                                {paper.assignments.map((assignment) => (
                                    <tr key={`${paper.paper_id}-${assignment.reviewer_id}`}>
                                        <td>
                                            {assignment.reviewer_name} ({assignment.reviewer_email})
                                        </td>
                                        <td>{assignment.anti_bid ? "Yes" : "No"}</td>
                                        <td>{assignment.anti_bid_reason || "-"}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() =>
                                                    handleUnassign(paper.paper_id, assignment.reviewer_id)
                                                }
                                                disabled={
                                                    busyKey ===
                                                    `unassign-${paper.paper_id}-${assignment.reviewer_id}`
                                                }
                                            >
                                                Unassign
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="table-wrap">
                        <table className="paper-table">
                            <thead>
                                <tr>
                                    <th>Bids</th>
                                    <th>Status</th>
                                    <th>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paper.bids.length === 0 && (
                                    <tr>
                                        <td className="empty-state" colSpan="3">
                                            No bids submitted.
                                        </td>
                                    </tr>
                                )}
                                {paper.bids.map((bid) => (
                                    <tr key={`${paper.paper_id}-bid-${bid.reviewer_id}`}>
                                        <td>
                                            {bid.reviewer_name} ({bid.reviewer_email})
                                        </td>
                                        <td>{bid.is_locked ? "Locked (historical)" : "Interested"}</td>
                                        <td>{new Date(bid.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="table-wrap">
                        <table className="paper-table">
                            <thead>
                                <tr>
                                    <th>Best Paper Votes</th>
                                    <th>Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paper.best_paper_votes.length === 0 && (
                                    <tr>
                                        <td className="empty-state" colSpan="2">
                                            No best paper votes yet.
                                        </td>
                                    </tr>
                                )}
                                {paper.best_paper_votes.map((vote) => (
                                    <tr key={`${paper.paper_id}-best-vote-${vote.reviewer_id}`}>
                                        <td>
                                            {vote.reviewer_name} ({vote.reviewer_email})
                                        </td>
                                        <td>{new Date(vote.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}
        </main>
    );
}

export default ReviewManagement;
