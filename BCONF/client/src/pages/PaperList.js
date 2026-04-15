import React, { use, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import SearchInput from "../components/SearchInput";
import PaperSearchIndex from "../search/PaperSearchIndex";

const API_BASE = process.env.REACT_APP_API_URL;

function PaperList({ user }){
    const [papers, setPapers]=useState([]);
    const [showForm, setShowForm]=useState(false);
    const [title, setTitle]=useState("");
    const [description, setDescription]=useState("");
    const [pdf, setPdf]=useState(null);
    const [error, setError]=useState("");
    const [busyBidPaperId, setBusyBidPaperId] = useState(null);
    const [reviewType, setReviewType] = useState("double_blind");
    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const [approvalFilter, setApprovalFilter] = useState("all");
    const isChair = user.role === "admin" || user.role === "deputy";

    const  loadPapers= async()=>{
        try {
            const res = await axios.get(`${API_BASE}/papers`);
            setPapers(res.data);
            setError("");
        } catch (err) {
            setError("Failed to load papers");
            setPapers([]);
        }
    };

    const loadReviewType = async () => {
        try {
            const res = await axios.get(`${API_BASE}/management/settings/review-type`);
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

    const submitPaper= async e=>{
        e.preventDefault();
        const formData=new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("pdf", pdf);

        try {
            await axios.post(`${API_BASE}/papers`, formData);
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
            await axios.post(`${API_BASE}/papers/${paperId}/bid`);
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
            await axios.delete(`${API_BASE}/papers/${paperId}/bid`);
            await loadPapers();
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to remove bid");
        } finally {
            setBusyBidPaperId(null);
        }
    };

    
    const isReviewer = user.role === "reviewer";
    const showAuthorColumn = !isReviewer || reviewType !== "double_blind";
    const canViewPaper = (paper) => {
        if (user.role === "reviewer") {
            return Boolean(paper.is_assigned || paper.is_authored_by_me);
        }
        return user.role === "admin" || user.role === "deputy" || paper.author_id === user.id;
    };

    const reviewerStatus = (paper) => {
        return PaperSearchIndex.getReviewerStatusLabel(paper) || "Unassigned";
    };

   
    const filteredByApproval = useMemo(() => {
        if (approvalFilter === "all"){
            return papers;
        }
        return papers.filter((paper) => {
            const status = (paper.approval || "pending")
                .toLowerCase()
                .replace(/\s+/g, "-");
            return status === approvalFilter;
        });
    }, [papers, approvalFilter]);

    const paperSearchIndex = useMemo(() => new PaperSearchIndex(filteredByApproval), [filteredByApproval]);
    const visiblePapers = useMemo(
        () => paperSearchIndex.search(deferredSearchQuery),
        [deferredSearchQuery, paperSearchIndex]
    );
    const activeSearchQuery = deferredSearchQuery.trim();
    const hasSearchQuery = activeSearchQuery.length > 0;
    const isSearchUpdating = searchQuery !== deferredSearchQuery;
    const emptyStateColSpan = isReviewer
    ? (showAuthorColumn ? 5 : 4)
    : isChair
        ? 5
        : 4;
    const tableMeta = hasSearchQuery
        ? `${visiblePapers.length} of ${papers.length} matching`
        : `${papers.length} total`;
    const searchHelperText = isSearchUpdating
        ? "Updating results..."
        : hasSearchQuery
          ? `Showing ${visiblePapers.length} matching ${visiblePapers.length === 1 ? "paper" : "papers"}.`
          : isReviewer
            ? "Search by title, visible author, description, or reviewer status."
            : "Search by title, visible author, or description.";
    const emptyStateMessage =
        papers.length === 0
            ? "No papers submitted yet."
            : `No papers match "${activeSearchQuery}".`;

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
                    <div>
                        <h2 className="panel-title">Submitted Papers</h2>
                        <p className="table-meta">{tableMeta}</p>
                    </div>
                    
                    {isChair && (
                        <div className="field" style={{ marginRight: "1rem" }}>
                            <label htmlFor="approval-filter">Approval Filter</label>
                            <select
                                id="approval-filter"
                                value={approvalFilter}
                                onChange={(e) => setApprovalFilter(e.target.value)}
                            >
                                <option value="all">All Papers</option>
                                <option value="approved">Approved</option>
                                <option value="denied">Denied</option>
                                <option value="awaiting-changes">Awaiting Changes</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    )}
                                
                    <SearchInput
                        id="paper-search"
                        label="Search papers"
                        placeholder="Search papers"
                        value={searchQuery}
                        onChange={setSearchQuery}
                        helperText={searchHelperText}
                    />
                </div>
                <div className="table-wrap">
                    <table className="paper-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                {showAuthorColumn && <th>Author</th>}
                                {isChair && <th>Email</th>}
                                <th>Description</th>
                                {isReviewer && <th>Status</th>}
                                {isChair && <th>Approval</th>}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visiblePapers.length === 0 && (
                                <tr>
                                    <td className="empty-state" colSpan={emptyStateColSpan}>{emptyStateMessage}</td>
                                </tr>
                            )}
                            {visiblePapers.map((p)=>(
                                <tr key={p.paper_id}>
                                    <td className="author-cell">{p.title || "Untitled Paper"}</td>
                                    {showAuthorColumn && <td className="author-cell">{p.author}</td>}
                                    {showAuthorColumn && isChair && <td className="email-cell">{p.author_email}</td>}
                                    <td>{p.description}</td>
                                    {isReviewer && <td>{reviewerStatus(p)}</td>}
                                    {isChair && <td>{p.approval || "Pending"}</td>}
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
