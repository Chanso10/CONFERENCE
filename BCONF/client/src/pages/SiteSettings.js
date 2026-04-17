import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
    DEFAULT_WELCOME_CONTENT,
    faqItemsToTextarea,
    listToTextarea,
    normalizeWelcomeContent,
    parseFaqTextarea,
    parseTextareaList,
} from "../utils/welcomeContent";

const API_BASE = process.env.REACT_APP_API_URL;

const createFormState = (content = DEFAULT_WELCOME_CONTENT) => {
    const normalized = normalizeWelcomeContent(content);

    return {
        ...normalized,
        highlightsText: listToTextarea(normalized.highlights),
        tracksText: listToTextarea(normalized.tracks),
        faqItemsText: faqItemsToTextarea(normalized.faq_items),
    };
};

function SiteSettings() {
    const [form, setForm] = useState(createFormState());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await axios.get(`${API_BASE}/management/settings/welcome`);
                setForm(createFormState(res.data?.content));
                setLastUpdatedAt(res.data?.updated_at || null);
                setError("");
            } catch (err) {
                setError("Failed to load welcome page settings");
                setForm(createFormState());
                setLastUpdatedAt(null);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
        setSuccess("");
    };

    const buildPayload = () => {
        const faqLines = form.faqItemsText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const faqItems = parseFaqTextarea(form.faqItemsText);

        if (faqLines.length !== faqItems.length) {
            throw new Error("Each FAQ line must use the format Question | Answer.");
        }

        return {
            conference_name: form.conference_name,
            conference_tagline: form.conference_tagline,
            hero_description: form.hero_description,
            event_dates: form.event_dates,
            location: form.location,
            venue: form.venue,
            format: form.format,
            audience: form.audience,
            overview: form.overview,
            submission_deadline: form.submission_deadline,
            notification_date: form.notification_date,
            registration_deadline: form.registration_deadline,
            contact_email: form.contact_email,
            contact_note: form.contact_note,
            highlights: parseTextareaList(form.highlightsText),
            tracks: parseTextareaList(form.tracksText),
            faq_items: faqItems,
        };
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = buildPayload();
            const res = await axios.put(`${API_BASE}/management/settings/welcome`, payload);
            setForm(createFormState(res.data?.content));
            setLastUpdatedAt(res.data?.updated_at || null);
            setSuccess("Welcome page settings saved.");
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Failed to save welcome page settings");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!window.confirm("Restore the welcome page content to the default placeholder values?")) {
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const res = await axios.delete(`${API_BASE}/management/settings/welcome`);
            setForm(createFormState(res.data?.content));
            setLastUpdatedAt(res.data?.updated_at || null);
            setSuccess("Welcome page settings were reset to the default placeholders.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to reset welcome page settings");
        } finally {
            setSaving(false);
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
                    <p className="page-kicker">Admin Panel</p>
                    <h1 className="page-title">Site Settings</h1>
                    <p className="page-subtitle">
                        Update the public welcome page with conference facts, timelines, topics, and contact details.
                    </p>
                </div>
                <Link className="btn btn-secondary" to="/welcome">
                    View Welcome Page
                </Link>
            </section>

            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <form className="panel settings-form" onSubmit={handleSave}>
                <div className="settings-header">
                    <div>
                        <h2 className="panel-title">Welcome Page Content</h2>
                        <p className="table-meta">
                            {lastUpdatedAt
                                ? `Last updated ${new Date(lastUpdatedAt).toLocaleString()}`
                                : "No published updates yet. Default placeholders are currently in use."}
                        </p>
                    </div>
                    <div className="settings-actions">
                        <button className="btn btn-secondary" type="button" onClick={handleReset} disabled={saving}>
                            Restore Defaults
                        </button>
                        <button className="btn btn-primary" type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>

                <div className="settings-grid">
                    <label className="field">
                        <span>Conference Name</span>
                        <input
                            name="conference_name"
                            type="text"
                            value={form.conference_name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="field">
                        <span>Tagline</span>
                        <input
                            name="conference_tagline"
                            type="text"
                            value={form.conference_tagline}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label className="field field-span-2">
                        <span>Hero Description</span>
                        <textarea
                            name="hero_description"
                            value={form.hero_description}
                            onChange={handleChange}
                            rows="4"
                        />
                    </label>

                    <label className="field">
                        <span>Event Dates</span>
                        <input name="event_dates" type="text" value={form.event_dates} onChange={handleChange} />
                    </label>

                    <label className="field">
                        <span>Location</span>
                        <input name="location" type="text" value={form.location} onChange={handleChange} />
                    </label>

                    <label className="field">
                        <span>Venue</span>
                        <input name="venue" type="text" value={form.venue} onChange={handleChange} />
                    </label>

                    <label className="field">
                        <span>Format</span>
                        <input name="format" type="text" value={form.format} onChange={handleChange} />
                    </label>

                    <label className="field field-span-2">
                        <span>Audience</span>
                        <input name="audience" type="text" value={form.audience} onChange={handleChange} />
                    </label>

                    <label className="field field-span-2">
                        <span>Overview</span>
                        <textarea name="overview" value={form.overview} onChange={handleChange} rows="5" />
                    </label>

                    <label className="field">
                        <span>Submission Deadline</span>
                        <input
                            name="submission_deadline"
                            type="text"
                            value={form.submission_deadline}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="field">
                        <span>Notification Date</span>
                        <input
                            name="notification_date"
                            type="text"
                            value={form.notification_date}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="field">
                        <span>Registration Deadline</span>
                        <input
                            name="registration_deadline"
                            type="text"
                            value={form.registration_deadline}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="field">
                        <span>Contact Email</span>
                        <input
                            name="contact_email"
                            type="email"
                            value={form.contact_email}
                            onChange={handleChange}
                        />
                    </label>

                    <label className="field field-span-2">
                        <span>Contact Note</span>
                        <textarea name="contact_note" value={form.contact_note} onChange={handleChange} rows="3" />
                    </label>

                    <label className="field field-span-2">
                        <span>Highlights</span>
                        <textarea
                            name="highlightsText"
                            value={form.highlightsText}
                            onChange={handleChange}
                            rows="5"
                        />
                        <small className="field-helper">Use one highlight per line.</small>
                    </label>

                    <label className="field field-span-2">
                        <span>Tracks</span>
                        <textarea name="tracksText" value={form.tracksText} onChange={handleChange} rows="5" />
                        <small className="field-helper">Use one track or topic per line.</small>
                    </label>

                    <label className="field field-span-2">
                        <span>FAQ Items</span>
                        <textarea
                            name="faqItemsText"
                            value={form.faqItemsText}
                            onChange={handleChange}
                            rows="6"
                        />
                        <small className="field-helper">Use one item per line in the format Question | Answer.</small>
                    </label>
                </div>
            </form>
        </main>
    );
}

export default SiteSettings;
