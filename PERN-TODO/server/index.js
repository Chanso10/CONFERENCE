const express = require("express");
const app = express();
const cors=require("cors");
const pool =require("./db");
const multer= require("multer");
const path= require("path");
const dotenv = require("dotenv");
dotenv.config();
const cookieParser = require("cookie-parser");

//dotenv consts
const PORT = process.env.PORT || 5000;

//middleware
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req,file,cb) =>{
        cb(null,Date.now()+path.extname(file.originalname));
    }
});
const upload =multer({ storage});

//////////////////TODOS start///////////////////
//make a todo
app.post("/todos", upload.single("pdf"),async(req,res)=>{
    try {
        const {author,description} = req.body;
        const pdfPath = req.file ? `uploads/${req.file.filename}` : null;
        const newTodo=await pool.query("INSERT INTO todo (author,description,pdf_path) VALUES($1,$2,$3) RETURNING *",
            [author,description,pdfPath]
        );
        res.json(newTodo.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})
//get all todos
app.get("/todos", async(req,res)=>{
    try {
        const allTodos=await pool.query("SELECT * FROM todo");
        res.json(allTodos.rows)
    } catch (err) {
        console.error(err.message);
    }
})
//get a todo
app.get("/todos/:id", async(req, res)=>{
    try {
        const{id}=req.params;
        const todo = await pool.query("SELECT * FROM todo WHERE todo_id= $1", [id]);

        res.json(todo.rows[0]);
    } catch (err) {
        console.error(err.message);
    }
})

//update a todo
app.put("/todos/:id", async(req,res) => {
    try {
        const {id} = req.params;
        const {description} =req.body;
        const updateTodo = await pool.query("UPDATE todo SET description = $1 WHERE todo_id = $2", [description, id]);
        res.json("Todo was updated")
    } catch (error) {
        console.error(err.message);
    }
})

//delete a todo

app.delete("/todos/:id",async (req,res)=> {
    try {
        const{id}=req.params;
        const deleteTodo=await pool.query("DELETE FROM todo WHERE todo_id = $1",[id]);
        res.json("Todo was deleted")
    } catch (err) {
        console.error(err.message);
    }
})
app.use("/uploads", express.static("uploads"));
app.listen(PORT,()=> {
    console.log(`server has started on port ${PORT}`);
});
//////////////////TODOS end///////////////////