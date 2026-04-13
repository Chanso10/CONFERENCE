import React, { useState } from "react";

const InputPaper = () =>{

    const [description, setDescription]=useState("")

    const onSubmitForm = async e => {
        e.preventDefault();
        try {
            const body = {description};
            const response = await fetch ("http://localhost:5000/papers",{
            method: "POST",
            headers:{"Content-Type": "application/json"},
            body: JSON.stringify(body)
        });

        window.location="/";
        } catch (err) {
            console.error(err.message);
        }
    }

    return (
        <main className="app-shell">
            <form className="panel paper-form" onSubmit={onSubmitForm}>
                <h2 className="panel-title">Submit Paper</h2>
                <label className="field">
                    <span>Description</span>
                    <input type="text" value={description} onChange={e=> setDescription(e.target.value)} />
                </label>
                <div className="form-actions">
                    <button className="btn btn-primary" type="submit">Add</button>
                </div>
            </form>
        </main>
    );
};

export default InputPaper;
