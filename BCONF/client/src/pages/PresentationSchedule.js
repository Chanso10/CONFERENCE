import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL;

const emptyForm = {
    paperId: "",
    presentationDate: "",
    startTime: "",
    endTime: "",
    room: "",
    sessionTitle: "",
    notes: "",
};

const toInputDate = (value) => (value ? String(value).slice(0, 10) : "");
const toInputTime = (value) => (value ? String(value).slice(0, 5) : "");

const formatDate = (value) => {
    const input = toInputDate(value);
    const parts = input.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) {
        return "";
    }

    const [year, month, day] = parts;
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const formatTime = (value) => {
    const input = toInputTime(value);
    const parts = input.split(":").map(Number);
    if (parts.length !== 2 || parts.some(Number.isNaN)) {
        return "";
    }

    const [hours, minutes] = parts;
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });
};

const formatTimeRange = (paper) => {
    if (!paper.start_time) {
        return "Not scheduled";
    }

    return paper.end_time
        ? `${formatTime(paper.start_time)} - ${formatTime(paper.end_time)}`
        : formatTime(paper.start_time);
};

function PresentationSchedule() {
    const [papers, setPapers] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [busyPaperId, setBusyPaperId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadSchedule = async () => {
        try {
            const res = await axios.get(`${API_BASE}/management/schedule`);
            setPapers(res.data);
            setError("");
        } catch (err) {
            setPapers([]);
            setError(err.response?.data?.message || "Failed to load presentation schedule");
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadSchedule();
            setLoading(false);
        };

        init();
    }, []);

    const scheduledPapers = useMemo(
        () => papers.filter((paper) => Boolean(paper.presentation_id)),
        [papers]
    );
    const unscheduledPapers = useMemo(
        () => papers.filter((paper) => !paper.presentation_id),
        [papers]
    );
    const selectablePapers = useMemo(
        () => papers.filter((paper) => !paper.presentation_id || String(paper.paper_id) === form.paperId),
        [papers, form.paperId]
    );
    const selectedPaper = papers.find((paper) => String(paper.paper_id) === form.paperId);

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setError("");
        setSuccess("");
    };

    const resetForm = () => {
        setForm(emptyForm);
        setError("");
        setSuccess("");
    };

    const editPaper = (paper) => {
        setForm({
            paperId: String(paper.paper_id),
            presentationDate: toInputDate(paper.presentation_date),
            startTime: toInputTime(paper.start_time),
            endTime: toInputTime(paper.end_time),
            room: paper.room || "",
            sessionTitle: paper.session_title || "",
            notes: paper.notes || "",
        });
        setError("");
        setSuccess("");
    };

    const savePresentation = async (event) => {
        event.preventDefault();
        if (!form.paperId) {
            setError("Select an approved paper first.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");
        try {
            await axios.put(`${API_BASE}/management/schedule/${form.paperId}`, {
                presentationDate: form.presentationDate,
                startTime: form.startTime,
                endTime: form.endTime,
                room: form.room,
                sessionTitle: form.sessionTitle,
                notes: form.notes,
            });
            await loadSchedule();
            setSuccess("Presentation slot saved.");
            setForm(emptyForm);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to save presentation slot");
        } finally {
            setSaving(false);
        }
    };

    const clearPresentation = async (paper) => {
        if (!window.confirm(`Clear the presentation slot for ${paper.title || "this paper"}?`)) {
            return;
        }

        setBusyPaperId(paper.paper_id);
        setError("");
        setSuccess("");
        try {
            await axios.delete(`${API_BASE}/management/schedule/${paper.paper_id}`);
            await loadSchedule();
            setSuccess("Presentation slot cleared.");
            if (String(paper.paper_id) === form.paperId) {
                setForm(emptyForm);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to clear presentation slot");
        } finally {
            setBusyPaperId(null);
        }
    };

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
                    <h1 className="page-title">Presentation Schedule</h1>
                    <p className="page-subtitle">Plan conference presentation slots for approved papers.</p>
                </div>
            </section>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <section className="schedule-overview">
                <div className="panel schedule-stat">
                    <span>Approved</span>
                    <strong>{papers.length}</strong>
                </div>
                <div className="panel schedule-stat">
                    <span>Scheduled</span>
                    <strong>{scheduledPapers.length}</strong>
                </div>
                <div className="panel schedule-stat">
                    <span>Needs Slot</span>
                    <strong>{unscheduledPapers.length}</strong>
                </div>
            </section>

            <section className="panel schedule-form-panel">
                <div className="table-head">
                    <div>
                        <h2 className="panel-title">
                            {selectedPaper?.presentation_id ? "Edit Presentation Slot" : "Schedule Presentation"}
                        </h2>
                        {selectedPaper && (
                            <p className="table-meta">{selectedPaper.title || "Untitled Paper"}</p>
                        )}
                    </div>
                </div>

                <form className="schedule-form" onSubmit={savePresentation}>
                    <div className="schedule-grid">
                        <label className="field schedule-field-wide">
                            <span>Approved Paper</span>
                            <select
                                value={form.paperId}
                                onChange={(event) => updateForm("paperId", event.target.value)}
                                required
                            >
                                <option value="">Select paper</option>
                                {selectablePapers.map((paper) => (
                                    <option value={paper.paper_id} key={paper.paper_id}>
                                        {paper.title || "Untitled Paper"} - {paper.author || "Unknown author"}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="field">
                            <span>Date</span>
                            <input
                                type="date"
                                value={form.presentationDate}
                                onChange={(event) => updateForm("presentationDate", event.target.value)}
                                required
                            />
                        </label>

                        <label className="field">
                            <span>Start Time</span>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={(event) => updateForm("startTime", event.target.value)}
                                required
                            />
                        </label>

                        <label className="field">
                            <span>End Time</span>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={(event) => updateForm("endTime", event.target.value)}
                            />
                        </label>

                        <label className="field">
                            <span>Room</span>
                            <input
                                type="text"
                                value={form.room}
                                onChange={(event) => updateForm("room", event.target.value)}
                                placeholder="Room or hall"
                                maxLength="160"
                            />
                        </label>

                        <label className="field schedule-field-wide">
                            <span>Session</span>
                            <input
                                type="text"
                                value={form.sessionTitle}
                                onChange={(event) => updateForm("sessionTitle", event.target.value)}
                                placeholder="Session title"
                                maxLength="160"
                            />
                        </label>

                        <label className="field schedule-field-full">
                            <span>Notes</span>
                            <textarea
                                rows="3"
                                value={form.notes}
                                onChange={(event) => updateForm("notes", event.target.value)}
                                placeholder="Presenter, setup, or logistics notes"
                                maxLength="1000"
                            />
                        </label>
                    </div>

                    <div className="schedule-actions">
                        <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                            Clear Form
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving || !form.paperId}>
                            {saving ? "Saving..." : "Save Slot"}
                        </button>
                    </div>
                </form>
            </section>

            <section className="panel table-panel">
                <div className="table-head">
                    <div>
                        <h2 className="panel-title">Approved Papers</h2>
                        <p className="table-meta">{scheduledPapers.length} scheduled of {papers.length}</p>
                    </div>
                </div>
                <div className="table-wrap">
                    <table className="paper-table">
                        <thead>
                            <tr>
                                <th>Paper</th>
                                <th>Author</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Session</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {papers.length === 0 && (
                                <tr>
                                    <td className="empty-state" colSpan="7">
                                        No approved papers are ready for scheduling.
                                    </td>
                                </tr>
                            )}
                            {papers.map((paper) => {
                                const isScheduled = Boolean(paper.presentation_id);
                                return (
                                    <tr key={paper.paper_id}>
                                        <td className="author-cell">{paper.title || "Untitled Paper"}</td>
                                        <td>
                                            {paper.author || "Unknown"}
                                            {paper.author_email && <span className="schedule-muted"> {paper.author_email}</span>}
                                        </td>
                                        <td>{isScheduled ? formatDate(paper.presentation_date) : "-"}</td>
                                        <td className="schedule-time">{formatTimeRange(paper)}</td>
                                        <td>
                                            {paper.session_title || "-"}
                                            {paper.room && <span className="schedule-muted"> {paper.room}</span>}
                                        </td>
                                        <td>
                                            <span className={`schedule-status ${isScheduled ? "scheduled" : "unscheduled"}`}>
                                                {isScheduled ? "Scheduled" : "Needs Slot"}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="schedule-row-actions">
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => editPaper(paper)}
                                                >
                                                    {isScheduled ? "Edit" : "Schedule"}
                                                </button>
                                                {isScheduled && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        onClick={() => clearPresentation(paper)}
                                                        disabled={busyPaperId === paper.paper_id}
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}

export default PresentationSchedule;
