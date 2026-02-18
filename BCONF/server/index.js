const express = require("express");
const app = express();
const cors=require("cors");
const pool =require("./db");
const multer= require("multer");
const path= require("path");
const dotenv = require("dotenv");
dotenv.config();
const cookieParser = require("cookie-parser");
const { protect, requireAdmin, requireAuthor } = require("./middleware/auth");

//middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req,file,cb) =>{
        cb(null,Date.now()+path.extname(file.originalname));
    }
});
const upload =multer({ storage});
//make a paper
app.post("/papers", protect, upload.single("pdf"),async(req,res)=>{
    try {
        const {description} = req.body;        if (req.user.role === 'editor') {
            return res.status(403).json({ message: "Editors cannot submit papers" });
        }        const pdfPath = req.file ? `uploads/${req.file.filename}` : null;
        const newPaper=await pool.query("INSERT INTO papers (author,description,pdf_path, author_id) VALUES($1,$2,$3, $4) RETURNING *",
            [req.user.name, description, pdfPath, req.user.id]
        );
        res.json(newPaper.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})
//get all papers
app.get("/papers", protect, async(req,res)=>{
    try {
        const allPapers=await pool.query("SELECT * FROM papers");
        res.json(allPapers.rows)
    } catch (err) {
        console.error(err.message);
    }
})
//get a paper
app.get("/papers/:id", protect, async(req, res)=>{
    try {
        const{id}=req.params;
        const paperId = parseInt(id);
        if (isNaN(paperId)) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }
        let paper;
        if (req.user.role === 'admin' || req.user.role === 'editor') {
            paper = await pool.query("SELECT * FROM papers WHERE paper_id= $1", [paperId]);
        } else {
            paper = await pool.query("SELECT * FROM papers WHERE paper_id= $1 AND author_id = $2", [paperId, req.user.id]);
        }
        if (paper.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found or access denied" });
        }
        res.json(paper.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Server error" });
    }
})
//update a paper

app.put("/papers/:id", protect, async(req,res) => {
    try {
        const {id} = req.params;
        const paperId = parseInt(id);
        if (isNaN(paperId)) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }
        const {description} =req.body;
        
        // Check if user owns the paper or is admin
        const paperCheck = await pool.query("SELECT author_id FROM papers WHERE paper_id = $1", [paperId]);
        if (paperCheck.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }
        if (req.user.role !== 'admin' && paperCheck.rows[0].author_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        
        const updatePaper = await pool.query("UPDATE papers SET description = $1 WHERE paper_id = $2", [description, paperId]);
        res.json("Paper was updated")
    } catch (error) {
        console.error(error.message);
    }
})

//delete a paper

app.delete("/papers/:id", protect, async (req,res)=> {
    try {
        const{id}=req.params;
        
        // Check if user owns the paper or is admin
        const paperCheck = await pool.query("SELECT author_id FROM papers WHERE paper_id = $1", [id]);
        if (paperCheck.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }
        if (req.user.role !== 'admin' && paperCheck.rows[0].author_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        
        const deletePaper=await pool.query("DELETE FROM papers WHERE paper_id = $1",[id]);
        res.json("Paper was deleted")
    } catch (err) {
        console.error(err.message);
    }
})
app.use("/uploads", express.static("uploads"));
app.listen(PORT,()=> {
    console.log(`server has started on port ${5000}`);
});

//Auth routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Ratings routes
// Get ratings for a paper
app.get("/papers/:id/ratings", protect, async (req, res) => {
    try {
        const { id } = req.params;
        const paperId = parseInt(id);
        if (isNaN(paperId)) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }
        // Check if user can view ratings
        if (req.user.role !== 'admin' && req.user.role !== 'editor') {
            // Check if user is the author
            const paper = await pool.query("SELECT author_id FROM papers WHERE paper_id = $1", [paperId]);
            if (paper.rows.length === 0 || paper.rows[0].author_id !== req.user.id) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        const ratings = await pool.query("SELECT * FROM ratings WHERE paper_id = $1", [paperId]);
        res.json(ratings.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Add rating to a paper (only editors)
app.post("/papers/:id/ratings", protect, async (req, res) => {
    try {
        const { id } = req.params;
        const paperId = parseInt(id);
        if (isNaN(paperId)) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }
        const { rating } = req.body;
        if (req.user.role !== 'editor') {
            return res.status(403).json({ message: "Only editors can add ratings" });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        const newRating = await pool.query(
            "INSERT INTO ratings (paper_id, editor_id, rating) VALUES ($1, $2, $3) RETURNING *",
            [paperId, req.user.id, rating]
        );
        res.json(newRating.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});