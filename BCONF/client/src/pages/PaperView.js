import React, { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_BASE = "http://localhost:5000";
const MAX_REVIEW_LENGTH = 5000;

const formatTimestamp = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleString();
};

function PaperView({ user }) {
    const { id } = useParams();
    const [paper, setPaper] = useState(null);
    const [error, setError] = useState("");
    const [ratings, setRatings] = useState([]);
    const [newRating, setNewRating] = useState("");
    const [ratingError, setRatingError] = useState("");
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState("");
    const [reviewError, setReviewError] = useState("");
    const [submittingRating, setSubmittingRating] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [antiBid, setAntiBid] = useState(false);
    const [antiBidReason, setAntiBidReason] = useState("");
    const [antiBidError, setAntiBidError] = useState("");
    const [submittingAntiBid, setSubmittingAntiBid] = useState(false);
    const [reviewType, setReviewType] = useState("double_blind");
    const isChair = user.role === "admin" || user.role === "deputy";

    const loadRatings = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/papers/${id}/ratings`);
            setRatings(res.data);
            setRatingError("");
        } catch (err) {
            setRatings([]);
        }
    }, [id]);

    const loadReviews = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/papers/${id}/reviews`);
            setReviews(res.data);
            setReviewError("");
        } catch (err) {
            setReviews([]);
            setReviewError("Unable to load discussion right now.");
        }
    }, [id]);

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


    useEffect(() => {
        loadReviewType();
        const loadPaper = async () => {
            try {
                const res = await axios.get(`${API_BASE}/papers/${id}`);
                setPaper(res.data);
                if (user.role === "reviewer") {
                    setAntiBid(Boolean(res.data.anti_bid));
                    setAntiBidReason(res.data.anti_bid_reason || "");
                }
                setError("");
                const ownsPaper =
                    (typeof res.data.author_id === "number" && res.data.author_id === user.id) ||
                    Boolean(res.data.is_authored_by_me);
                if (isChair || !ownsPaper) {
                    await Promise.all([loadRatings(), loadReviews()]);
                } else {
                    setRatings([]);
                    setReviews([]);
                    setRatingError("");
                    setReviewError("");
                }
            } catch (err) {
                setError("Failed to load paper or access denied");
                setPaper(null);
                setRatings([]);
                setReviews([]);
            }
        };

        loadPaper();
    }, [id, isChair, loadRatings, loadReviews, user.id, user.role]);

    const submitRating = async (e) => {
        e.preventDefault();
        setSubmittingRating(true);
        try {
            await axios.post(`${API_BASE}/papers/${id}/ratings`, { rating: Number.parseInt(newRating, 10) });
            await loadRatings();
            setNewRating("");
        } catch (err) {
            setRatingError("Failed to submit rating");
        } finally {
            setSubmittingRating(false);
        }
    };

    const submitReview = async (e) => {
        e.preventDefault();
        const trimmedReview = newReview.trim();

        if (!trimmedReview) {
            setReviewError("Please add text before posting.");
            return;
        }

        setSubmittingReview(true);
        try {
            await axios.post(`${API_BASE}/papers/${id}/reviews`, { body: trimmedReview });
            await loadReviews();
            setNewReview("");
        } catch (err) {
            setReviewError("Failed to post review");
        } finally {
            setSubmittingReview(false);
        }
    };

    const submitAntiBid = async (e) => {
        e.preventDefault();
        setSubmittingAntiBid(true);
        try {
            await axios.put(`${API_BASE}/papers/${id}/anti-bid`, {
                antiBid,
                reason: antiBidReason,
            });
            setAntiBidError("");
            await loadPapersafe();
        } catch (err) {
            setAntiBidError(err.response?.data?.message || "Failed to save anti-bid");
        } finally {
            setSubmittingAntiBid(false);
        }
    };

    const loadPapersafe = async () => {
        try {
            const res = await axios.get(`${API_BASE}/papers/${id}`);
            setPaper(res.data);
            setAntiBid(Boolean(res.data.anti_bid));
            setAntiBidReason(res.data.anti_bid_reason || "");
        } catch (err) {
            // no-op; page-level error handling already covers hard failures
        }
    };

    if (error) {
        return (
            <main className="app-shell">
                <div className="error">{error}</div>
            </main>
        );
    }

    if (!paper) {
        return (
            <main className="app-shell">
                <section className="panel loading-panel">Loading...</section>
            </main>
        );
    }

    const isAuthoredByMe =
        (typeof paper.author_id === "number" && paper.author_id === user.id) || Boolean(paper.is_authored_by_me);
    const canSeeFeedback = isChair || !isAuthoredByMe;
    const canPostDiscussion =
        canSeeFeedback && user.role !== "author" && (user.role !== "reviewer" || paper.is_assigned);

    return (
        <main className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Paper Detail</p>
                    <h1 className="page-title">Review Submission</h1>
                </div>
                <Link className="btn btn-secondary" to="/papers">
                    Back to List
                </Link>
            </section>

            <section className="paper-view-layout">
                <aside className="panel">
                    <h2 className="panel-title">{paper.title || "Untitled Paper"}</h2>
                    {showAuthor(paper) && paper.author && <p className="table-meta">Author: {paper.author}</p>}
                    
                    <p className="paper-description">{paper.description}</p>
                    {user && user.role === "reviewer" && paper.is_assigned && (
                        <>
                            <form onSubmit={submitRating} className="rating-form">
                                <label className="field">
                                    <span>Rating (1-5)</span>
                                    <select
                                        className="role-select"
                                        value={newRating}
                                        onChange={(e) => setNewRating(e.target.value)}
                                        required
                                    >
                                        <option value="">Select</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                    </select>
                                </label>
                                <button type="submit" className="btn btn-primary" disabled={submittingRating}>
                                    {submittingRating ? "Submitting..." : "Submit Rating"}
                                </button>
                                {ratingError && <div className="error">{ratingError}</div>}
                            </form>
                            <form onSubmit={submitAntiBid} className="rating-form">
                                <label className="field">
                                    <span>
                                        <input
                                            type="checkbox"
                                            checked={antiBid}
                                            onChange={(e) => setAntiBid(e.target.checked)}
                                        />{" "}
                                        Anti-bid (decline this assignment)
                                    </span>
                                </label>
                                <label className="field">
                                    <span>Optional reason</span>
                                    <textarea
                                        rows="3"
                                        value={antiBidReason}
                                        onChange={(e) => setAntiBidReason(e.target.value)}
                                        placeholder="Optional: Share conflict reason or concerns..."
                                    />
                                </label>
                                <button type="submit" className="btn btn-secondary" disabled={submittingAntiBid}>
                                    {submittingAntiBid ? "Saving..." : "Save Anti-Bid"}
                                </button>
                                {antiBidError && <div className="error">{antiBidError}</div>}
                            </form>
                        </>
                    )}
                </aside>

                <article className="panel pdf-panel">
                    <iframe src={`${API_BASE}/${paper.pdf_path}`} title="paper-pdf" />
                </article>
            </section>

            {canSeeFeedback && ratings.length > 0 && (
                <section className="panel">
                    <div className="table-head">
                        <h2 className="panel-title">Ratings</h2>
                    </div>
                    <div className="review-list">
                        {ratings.map((rating) => (
                            <div key={rating.id} className="review">
                                {rating.reviewer_label || rating.reviewer_name || "Reviewer"}: {rating.rating}/5
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {canSeeFeedback && (
                <section className="panel">
                    <div className="table-head">
                        <h2 className="panel-title">Review Discussion</h2>
                        <p className="table-meta">{reviews.length} posts</p>
                    </div>

                    {canPostDiscussion && (
                        <form onSubmit={submitReview} className="discussion-form">
                            <label className="field">
                                <span>Add your review notes</span>
                                <textarea
                                    rows="4"
                                    value={newReview}
                                    onChange={(e) => setNewReview(e.target.value)}
                                    maxLength={MAX_REVIEW_LENGTH}
                                    placeholder="Share strengths, concerns, and recommendations..."
                                    required
                                />
                            </label>
                            <div className="form-actions">
                                <p className="table-meta">
                                    {newReview.length}/{MAX_REVIEW_LENGTH}
                                </p>
                                <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                                    {submittingReview ? "Posting..." : "Post Review"}
                                </button>
                            </div>
                            {reviewError && <p className="form-error">{reviewError}</p>}
                        </form>
                    )}

                    <div className="review-list">
                        {reviews.length === 0 && (
                            <div className="empty-state review-empty">
                                No reviews yet.
                            </div>
                        )}
                        {reviews.map((review) => (
                            <article key={review.review_id} className="review">
                                <div className="review-header">
                                    <div className="review-author-group">
                                        <span className="review-author">{review.author_name}</span>
                                        <span className="review-role-badge">{review.author_role}</span>
                                    </div>
                                    <time className="review-time" dateTime={review.created_at}>
                                        {formatTimestamp(review.created_at)}
                                    </time>
                                </div>
                                <p className="review-body">{review.body}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </main>
    );
}

export default PaperView;
