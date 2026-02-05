import React, {useEffect, useState} from "react";
import { Link } from "react-router-dom";

function PaperList(){
    const [papers, setPapers]=useState([]);
    const [showForm, setShowForm]=useState(false);
    const [author, setAuthor]=useState("");
    const [description, setDescription]=useState("");
    const [pdf, setPdf]=useState(null);

    const  loadPapers= async()=>{
        const res = await fetch("http://localhost:5000/todos");
        const data= await res.json();
        setPapers(data);
    };

    useEffect(()=>{
        loadPapers();
    },[]);

    const submitPaper= async e=>{
        e.preventDefault();
        const formData=new FormData();
        formData.append("author", author);
        formData.append("description", description);
        formData.append("pdf", pdf);

        await fetch("http://localhost:5000/todos",{
            method:"POST",
            body: formData
        });
        await loadPapers();
        setShowForm(false);
        setAuthor("");
        setDescription("");
        setPdf(null);
    };
    return(
        <div>
            <button onClick={()=> setShowForm(!showForm)}>Submit New Paper</button>
            {showForm && (
                <form onSubmit={submitPaper}>
                    <input type="text" placeholder="Author" value={author} onChange={e=> setAuthor(e.target.value)} required/>
                    <input type="text" placeholder="Description" value={description} onChange={e=> setDescription(e.target.value)} required/>
                    <input type="file" onChange={e=> setPdf(e.target.files[0])}/>
                    <button type="submit">Upload</button>
                </form>
            )}

            <hr />
            <table border="1" cellPadding="8">
                <thead>
                    <tr>
                        <th>Author</th>
                        <th>Description</th>
                        <th>View</th>
                    </tr>
                </thead>
                <tbody>
                    {papers.length === 0 && (
                        <tr>
                            <td colSpan="3">No papers submitted yet.</td>
                        </tr>
                    )}
                    {papers.map((p)=>(
                        <tr key={p.todo_id}>
                            <td>{p.author}</td>
                            <td>{p.description}</td>
                            <td>
                                <Link to={`/todos/${p.todo_id}`}><button>View Paper</button></Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

        </div>
    );
}

export default PaperList;