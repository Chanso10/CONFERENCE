const express = require("express");
const app = express();
const cors=require("cors");
const pool =require("./db");
const multer= require("multer");
const path= require("path");
//middleware
app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req,file,cb) =>{
        cb(null,Date.now()+path.extname(file.originalname));
    }
});
const upload =multer({ storage});
//make a paper
app.post("/papers", upload.single("pdf"),async(req,res)=>{
    try {
        const {author,description} = req.body;
        const pdfPath = req.file ? `uploads/${req.file.filename}` : null;
        const newPaper=await pool.query("INSERT INTO papers (author,description,pdf_path) VALUES($1,$2,$3) RETURNING *",
            [author,description,pdfPath]
        );
        res.json(newPaper.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})
//get all papers
app.get("/papers", async(req,res)=>{
    try {
        const allPapers=await pool.query("SELECT * FROM papers");
        res.json(allPapers.rows)
    } catch (err) {
        console.error(err.message);
    }
})
//get a paper
app.get("/papers/:id", async(req, res)=>{
    try {
        const{id}=req.params;
        const paper = await pool.query("SELECT * FROM papers WHERE paper_id= $1", [id]);

        res.json(paper.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})
//update a paper

app.put("/papers/:id", async(req,res) => {
    try {
        const {id} = req.params;
        const {description} =req.body;
        const updatePaper = await pool.query("UPDATE papers SET description = $1 WHERE paper_id = $2", [description, id]);
        res.json("Paper was updated")
    } catch (error) {
        console.error(error.message);
    }
})

//delete a paper

app.delete("/papers/:id",async (req,res)=> {
    try {
        const{id}=req.params;
        const deletePaper=await pool.query("DELETE FROM papers WHERE paper_id = $1",[id]);
        res.json("Paper was deleted")
    } catch (err) {
        console.error(err.message);
    }
})
app.use("/uploads", express.static("uploads"));
app.listen(5000,()=> {
    console.log("server has started on port 5000");
});