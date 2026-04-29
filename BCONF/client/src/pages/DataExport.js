import React, { useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL;

const exportOptions = [
  { key: "attendees", label: "Download all attendees" },
  { key: "authors", label: "Download all authors" },
  { key: "reviewers", label: "Download all reviewers" },
  { key: "papers", label: "Download all papers" },
  { key: "approved_papers", label: "Download approved papers" },
  { key: "denied_papers", label: "Download denied papers" },
  { key: "awaiting_changes_papers", label: "Download papers awaiting changes" },
  { key: "pending_papers", label: "Download pending papers" },
];

const DataExport = () => {
  const [busyType, setBusyType] = useState("");
  const [error, setError] = useState("");

  const handleExport = async (type) => {
    setError("");
    setBusyType(type);

    try {
      const response = await axios.get(`${API_BASE}/management/export`, {
        params: { type },
        responseType: "blob",
      });

      const filename = `bconf-${type}.csv`;
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to download export");
    } finally {
      setBusyType("");
    }
  };

  return (
    <main className="app-shell">
      <section className="page-header">
        <div>
          <p className="page-kicker">Chair Panel</p>
          <h1 className="page-title">Data Export</h1>
          <p className="page-subtitle">Download attendee, author, reviewer, and paper exports as CSV files.</p>
        </div>
      </section>

      {error && <div className="error">{error}</div>}
        <div style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
          {exportOptions.map((option) => (
            <button
              key={option.key}
              className="btn btn-primary"
              type="button"
              disabled={busyType === option.key}
              onClick={() => handleExport(option.key)}
            >
              {busyType === option.key ? `Downloading ${option.label.toLowerCase()}...` : option.label}
            </button>
          ))}
        </div>
    </main>
  );
};

export default DataExport;
