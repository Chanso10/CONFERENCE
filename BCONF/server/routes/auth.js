const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const dotenv = require("dotenv");
const { protect, requireAdmin } = require("../middleware/auth");
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
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }
        
        const userExists = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // If first user, automatically make admin
        let newUser;
        const isFirstUser = await pool.query("SELECT COUNT(*) FROM users");
        if (parseInt(isFirstUser.rows[0].count, 10) === 0) {
            newUser = await pool.query(
                "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin') RETURNING id, name, email, role", 
                    [name, email, hashedPassword ]
            );
        } else {
            newUser = await pool.query(
                "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'author') RETURNING id, name, email, role", 
                    [name, email, hashedPassword ]
            );
        }

        const token = genToken(newUser.rows[0].id);
        res.cookie("token", token, cookieOptions);

        return res.status(201).json({ user: newUser.rows[0] });
    } catch (err) {
        console.error(err);
        if (err.code === "23505") {
            return res.status(400).json({ message: "User already exists" });
        }
        return res.status(500).json({ message: "Server error" });
    }
});

// login a user
router.post("/login", async (req, res) => {
    try {
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

        return res.json({ user: { id: userData.id, name: userData.name, email: userData.email, role: userData.role } });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }

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

// Get all users (admin only)
router.get("/users", protect, requireAdmin, async (req, res) => {
    try {
        const users = await pool.query("SELECT id, name, email, role FROM users");
        res.json(users.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Update user role (admin only)
router.put("/users/:id/role", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!['author', 'admin', 'reviewer', 'deputy'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    try {
        const updatedUser = await pool.query(
            "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role",
            [role, id]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(updatedUser.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
