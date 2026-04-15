import React, { useEffect, useState } from "react";
import axios from "axios";

const ListPapers = () => {
  const [papers, setPapers] = useState([]);

  //delete paper function

  const deletePaper = async id => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/papers/${id}`);
      setPapers(papers.filter(paper => paper.paper_id !== id));
    } catch (err) {
      console.error(err.message);
    }
  };

  const getPapers = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/papers`);
      setPapers(response.data);
    } catch (err) {
      console.error(err.message);
      setPapers([]);
    }
  };

  useEffect(() => {
    getPapers();
  }, []);

  return (
    <main className="app-shell">
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
                  <td className="empty-state" colSpan="3">No papers found.</td>
                </tr>
              )}
              {papers.map(paper => (
                <tr key={paper.paper_id}>
                  <td className="author-cell">{paper.author}</td>
                  <td>{paper.description}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      onClick={() => deletePaper(paper.paper_id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default ListPapers;
