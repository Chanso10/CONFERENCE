const jwt = require("jsonwebtoken");
const pool = require("../db");

const serializeUser = (row) => {
    return {
        id: row.id,
        name: row.name,
        firstName: row.first_name || "",
        lastName: row.last_name || "",
        institution: row.institution || "",
        pronouns: row.pronouns || "",
        allergies: row.allergies || "",
        phone: row.phone || "",
        email: row.email,
        role: row.role,
    };
};

const protect = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await pool.query(
            `
            SELECT id, name, first_name, last_name, institution, pronouns, allergies, phone, email, role
            FROM users
            WHERE id = $1
            `,
            [decoded.id]
        );

        if (user.rows.length === 0) {
            return res.status(401).json({ message: "Not authorized, user not found" });
        }

        req.user = serializeUser(user.rows[0]);
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: "Not authorized, token failed" });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Access denied" });
        }
        next();
    };
};

const requireAdmin = requireRole("admin");
const requireAuthor = requireRole("author");

module.exports = { protect, requireAdmin, requireAuthor };