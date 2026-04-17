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
    maxAge: 24 * 60 * 60 * 1000 * 30,
};

const USER_RETURNING_FIELDS = `
    id,
    name,
    first_name,
    last_name,
    institution,
    pronouns,
    allergies,
    phone,
    email,
    role,
    is_attendee
`;

const genToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });
};

const normalizeOptionalText = (value) => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed || null;
};

const normalizeEmail = (value) => {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().toLowerCase();
};

const splitLegacyName = (value) => {
    if (typeof value !== "string") {
        return { firstName: "", lastName: "" };
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return { firstName: "", lastName: "" };
    }

    const parts = trimmed.split(/\s+/);
    return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
    };
};

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
        isAttendee: row.is_attendee || false,
    };
};

const getRegistrationPayload = (body = {}) => {
    const legacyName = typeof body.name === "string" ? body.name.trim() : "";
    const derivedNameParts = splitLegacyName(legacyName);

    const firstName = typeof body.firstName === "string" && body.firstName.trim()
        ? body.firstName.trim()
        : derivedNameParts.firstName;
    const lastName = typeof body.lastName === "string" && body.lastName.trim()
        ? body.lastName.trim()
        : derivedNameParts.lastName;
    const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || legacyName;

    return {
        name: displayName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: normalizeEmail(body.email),
        password: typeof body.password === "string" ? body.password : "",
        institution: normalizeOptionalText(body.institution),
        pronouns: normalizeOptionalText(body.pronouns),
        allergies: normalizeOptionalText(body.allergies),
        phone: normalizeOptionalText(body.phone),
        registrationType: body.registrationType === "attendee" ? "attendee" : "participant",
        isAttendee: body.registrationType === "attendee" || body.isAttendee === true,
    };
};

router.post("/register", async (req, res) => {
    try {
        const registration = getRegistrationPayload(req.body);

        if (!registration.name || !registration.email || !registration.password) {
            return res.status(400).json({ message: "Please fill in all required fields" });
        }

        const userExists = await pool.query("SELECT 1 FROM users WHERE email = $1", [registration.email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(registration.password, 10);
        const existingConferenceUsers = await pool.query("SELECT COUNT(*) FROM users WHERE role <> 'attendee'");
        const shouldCreateAdmin =
            registration.registrationType !== "attendee" && parseInt(existingConferenceUsers.rows[0].count, 10) === 0;
        const role = shouldCreateAdmin
            ? "admin"
            : registration.registrationType === "attendee"
              ? "attendee"
              : "author";

        const newUser = await pool.query(
            `
            INSERT INTO users (name, first_name, last_name, institution, pronouns, allergies, phone, email, password, role, is_attendee)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING ${USER_RETURNING_FIELDS}
            `,
            [
                registration.name,
                registration.firstName,
                registration.lastName,
                registration.institution,
                registration.pronouns,
                registration.allergies,
                registration.phone,
                registration.email,
                hashedPassword,
                role,
                registration.isAttendee,
            ]
        );

        const token = genToken(newUser.rows[0].id);
        res.cookie("token", token, cookieOptions);

        return res.status(201).json({ user: serializeUser(newUser.rows[0]) });
    } catch (err) {
        console.error(err);
        if (err.code === "23505") {
            return res.status(400).json({ message: "User already exists" });
        }
        return res.status(500).json({ message: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = typeof req.body.password === "string" ? req.body.password : "";

        if (!email || !password) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }

        const user = await pool.query(
            `
            SELECT ${USER_RETURNING_FIELDS}, password
            FROM users
            WHERE email = $1
            `,
            [email]
        );
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

        return res.json({ user: serializeUser(userData) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});

router.get("/me", protect, async (req, res) => {
    res.json({ user: req.user });
});

router.post("/logout", protect, (req, res) => {
    res.clearCookie("token", cookieOptions);
    res.json({ message: "Logged out successfully" });
});

router.get("/users", protect, requireAdmin, async (req, res) => {
    try {
        const users = await pool.query(
            `
            SELECT ${USER_RETURNING_FIELDS}
            FROM users
            ORDER BY created_at DESC, id DESC
            `
        );
        res.json(users.rows.map(serializeUser));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.put("/users/:id/role", protect, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!["author", "admin", "reviewer", "deputy", "attendee"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
    }

    try {
        const updatedUser = await pool.query(
            `
            UPDATE users
            SET role = $1
            WHERE id = $2
            RETURNING ${USER_RETURNING_FIELDS}
            `,
            [role, id]
        );

        if (updatedUser.rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(serializeUser(updatedUser.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;