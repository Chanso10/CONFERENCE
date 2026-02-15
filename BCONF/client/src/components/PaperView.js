import React, {useEffect, useState} from "react";
import {useParams, Link} from "react-router-dom";

function PaperView(){
    const {id}=useParams();
    const [paper, setPaper]=useState(null);

    useEffect(()=>{
        const loadPaper=async()=>{
            const res=await fetch(`http://localhost:5000/papers/${id}`);
            const data=await res.json();
            setPaper(data);
        }

        loadPaper();
    },[id]);

    if(!paper) return <main className="app-shell"><div className="panel">Loading...</div></main>;

    return(
        <main className="app-shell">
            <section className="page-header">
                <div>
                    <p className="page-kicker">Paper Detail</p>
                    <h1 className="page-title">Review Submission</h1>
                </div>
                <Link className="btn btn-secondary" to ="/">Back to List</Link>
            </section>

            <section className="paper-view-layout">
                <aside className="panel">
                    <h2 className="panel-title">{paper.author}</h2>
                    <p className="paper-description">{paper.description}</p>
                </aside>

                <article className="panel pdf-panel">
                    <iframe
                        src={`http://localhost:5000/${paper.pdf_path}`}
                        title="paper-pdf"
                    />
                </article>
            </section>
        </main>
    );
}

export default PaperView;
