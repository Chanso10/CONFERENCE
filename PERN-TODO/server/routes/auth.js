const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool =require("../db");
const dotenv = require("dotenv");
const {protect} = require("../middleware/auth");
dotenv.config();

const router = express.Router();
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 30* 24 * 60 * 60 * 1000 // 30 days
};

const generateToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: '30d'});
};

router.post("/register", async(req,res)=>{
    const {name,email,password} = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({message: "Please provide all required fields"});
    }

    const userExists = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({message: "User already exists"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email`,
        [name, email, hashedPassword]
    );

    const token = generateToken(newUser.rows[0].id);
    res.cookie("token", token, cookieOptions);

    return res.status(201).json({user: newUser.rows[0]});
});

//Login
router.post('/login', async(req,res)=>{
    const {email,password} = req.body;
    if (!email || !password) {
        return res.status(400).json({message: "Please provide all required fields"});
    }
    const user = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);

    if (user.rows.length === 0) {
        return res.status(400).json({message: "Invalid credentials"});
    }

    const userDate = user.rows[0];
    
    const isMatch = await bcrypt.compare(password, userDate.password);

    if (!isMatch) {
        return res.status(400).json({message: "Invalid credentials"});
    }

    const token = generateToken(userDate.id);

    res.cookie("token", token, cookieOptions);

    return res.json({user: {id: userDate.id, name: userDate.name, email: userDate.email}});
});

//Me
router.get("/me", protect, async(req,res)=>{
    res.json(req.user);
    //return info of the logged in user from protect middleware
});

//Logout
router.post("/logout", (req,res)=>{
    res.clearCookie("token", cookieOptions);
    return res.json({message: "Logged out successfully"});
});

module.exports = router;