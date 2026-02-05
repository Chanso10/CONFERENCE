import React, {useEffect, useState} from "react";
import {useParams, Link} from "react-router-dom";

function PaperView(){
    const {id}=useParams();
    const [paper, setPaper]=useState(null);

    useEffect(()=>{
        const loadPaper=async()=>{
            const res=await fetch(`http://localhost:5000/todos/${id}`);
            const data=await res.json();
            setPaper(data);
        }

        loadPaper();
    },[id]);

    if(!paper) return <div>Loading...</div>;

    return(
        <div>
            <Link to ="/">Back to Paper List</Link>
            <h2>{paper.author}</h2>
            <p>{paper.description}</p>

            <iframe
                src={`http://localhost:5000/${paper.pdf_path}`}
                width="100%"
                height="700"
                title="paper-pdf"
                />
        </div>
    );
}

export default PaperView;