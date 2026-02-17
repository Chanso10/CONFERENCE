const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const dotenv = require("dotenv");
const { protect } = require("../middleware/auth");
dotenv.config();

const router = express.Router();
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000 * 30, // 30 days
};

const genToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
}

// register a user
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }
    
    const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    //If first user, automatically make admin
    let newUser;
    const isFirstUser = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(isFirstUser.rows[0].count) === 0) {
        newUser = await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role", 
                [name, email, hashedPassword ]
        );
    }
    else{
        newUser = await pool.query(
            "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role", 
                [name, email, hashedPassword ]
        );
    }

    const token = genToken(newUser.rows[0].id);
    res.cookie("token", token, cookieOptions);

    return res.status(201).json({ user: newUser.rows[0] });
});

// login a user
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Please fill in all fields" });
    }

    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    const userData = user.rows[0];
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
        return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = genToken(userData.id);
    res.cookie("token", token, cookieOptions);

    res.json({ user: { id: userData.id, name: userData.name, email: userData.email, role: userData.role } });

});

// Logined user (me)
router.get("/me", protect, async (req, res) => {
    res.json({ user: req.user });
});

// logout a user
router.post("/logout", protect, (req, res) => {
    res.clearCookie("token", cookieOptions);
    res.json({ message: "Logged out successfully" });
});

module.exports = router;