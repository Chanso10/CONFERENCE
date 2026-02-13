const express = require("express");
const app = express();
const cors=require("cors"); 
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool =require("../db");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: 30* 24 * 60 * 60 * 1000 // 30 days
};

const generateToken = (user) => {
    return jwt.sign({id}, process.env.JWT_secrtet, {expiresIn: '30d'});
};

router.post("/register", async(req,res)=>{
    const {username,email,password} = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({message: "Please provide all required fields"});
    }

    const userExists = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({message: "User already exists"});
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
        `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, name, email`,
        [username, email, hashedPassword]
    );

    const token = generateToken(newUser.rows[0].id);
    res.cookie("token", token, cookieOptions);

    return res.status(201).json({user: newUser.rows[0]});
});