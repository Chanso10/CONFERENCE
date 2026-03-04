const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const pool = require("./db");
const { protect } = require("./middleware/auth");
const authRoutes = require("./routes/auth");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MAX_REVIEW_LENGTH = 5000;

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);

const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage });

const parsePositiveInt = (value) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const hasGlobalPaperAccess = (user) => user.role === "admin" || user.role === "reviewer";

const fetchAccessiblePaper = async (paperId, user) => {
    if (hasGlobalPaperAccess(user)) {
        const paper = await pool.query("SELECT * FROM papers WHERE paper_id = $1", [paperId]);
        return paper.rows[0] || null;
    }

    const paper = await pool.query(
        "SELECT * FROM papers WHERE paper_id = $1 AND author_id = $2",
        [paperId, user.id]
    );
    return paper.rows[0] || null;
};

const ensurePaperAccess = async (req, res, next) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchAccessiblePaper(paperId, req.user);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found or access denied" });
        }

        req.paperId = paperId;
        req.paper = paper;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};

const ensureReviewSchema = async () => {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS paper_reviews (
            review_id BIGSERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
            author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            parent_review_id BIGINT REFERENCES paper_reviews(review_id) ON DELETE CASCADE,
            body TEXT NOT NULL,
            visibility_scope VARCHAR(32) NOT NULL DEFAULT 'paper_access',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT paper_reviews_body_not_blank CHECK (char_length(trim(body)) > 0)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_reviews_paper_created_idx
        ON paper_reviews (paper_id, created_at, review_id)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_reviews_paper_parent_idx
        ON paper_reviews (paper_id, parent_review_id, created_at, review_id)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_reviews_author_idx
        ON paper_reviews (author_id, created_at DESC)
    `);
};

app.post("/papers", protect, upload.single("pdf"), async (req, res) => {
    try {
        const { description } = req.body;
        if (req.user.role === "reviewer") {
            return res.status(403).json({ message: "Reviewers cannot submit papers" });
        }

        const pdfPath = req.file ? `uploads/${req.file.filename}` : null;
        const newPaper = await pool.query(
            "INSERT INTO papers (author, description, pdf_path, author_id) VALUES($1, $2, $3, $4) RETURNING *",
            [req.user.name, description, pdfPath, req.user.id]
        );
        res.status(201).json(newPaper.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers", protect, async (req, res) => {
    try {
        const allPapers = hasGlobalPaperAccess(req.user)
            ? await pool.query("SELECT * FROM papers ORDER BY created_at DESC")
            : await pool.query(
                  "SELECT * FROM papers WHERE author_id = $1 ORDER BY created_at DESC",
                  [req.user.id]
              );
        res.json(allPapers.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers/:id", protect, ensurePaperAccess, async (req, res) => {
    res.json(req.paper);
});

app.put("/papers/:id", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const { description } = req.body;
        const paperCheck = await pool.query("SELECT author_id FROM papers WHERE paper_id = $1", [paperId]);
        if (paperCheck.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (req.user.role !== "admin" && paperCheck.rows[0].author_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        await pool.query("UPDATE papers SET description = $1 WHERE paper_id = $2", [description, paperId]);
        res.json({ message: "Paper was updated" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/papers/:id", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paperCheck = await pool.query("SELECT author_id FROM papers WHERE paper_id = $1", [paperId]);
        if (paperCheck.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (req.user.role !== "admin" && paperCheck.rows[0].author_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        await pool.query("DELETE FROM papers WHERE paper_id = $1", [paperId]);
        res.json({ message: "Paper was deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers/:id/ratings", protect, ensurePaperAccess, async (req, res) => {
    try {
        const ratings = await pool.query(
            `
            SELECT r.id, r.paper_id, r.editor_id, r.rating, r.review, u.name AS reviewer_name
            FROM ratings r
            JOIN users u ON u.id = r.editor_id
            WHERE r.paper_id = $1
            ORDER BY r.id DESC
            `,
            [req.paperId]
        );
        res.json(ratings.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/papers/:id/ratings", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        if (req.user.role !== "reviewer") {
            return res.status(403).json({ message: "Only reviewers can add ratings" });
        }

        const paper = await pool.query("SELECT paper_id FROM papers WHERE paper_id = $1", [paperId]);
        if (paper.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }

        const { rating } = req.body;
        const numericRating = Number.parseInt(rating, 10);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        const newRating = await pool.query(
            `
            INSERT INTO ratings (paper_id, editor_id, rating)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [paperId, req.user.id, numericRating]
        );
        res.status(201).json(newRating.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers/:id/reviews", protect, ensurePaperAccess, async (req, res) => {
    try {
        const reviews = await pool.query(
            `
            SELECT
                pr.review_id,
                pr.paper_id,
                pr.author_id,
                pr.parent_review_id,
                pr.body,
                pr.visibility_scope,
                pr.created_at,
                pr.updated_at,
                u.name AS author_name,
                u.role AS author_role
            FROM paper_reviews pr
            JOIN users u ON u.id = pr.author_id
            WHERE pr.paper_id = $1
            ORDER BY pr.created_at ASC, pr.review_id ASC
            `,
            [req.paperId]
        );
        res.json(reviews.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/papers/:id/reviews", protect, ensurePaperAccess, async (req, res) => {
    try {
        const rawBody = typeof req.body.body === "string" ? req.body.body : "";
        const body = rawBody.trim();
        if (!body) {
            return res.status(400).json({ message: "Review text is required" });
        }
        if (body.length > MAX_REVIEW_LENGTH) {
            return res.status(400).json({
                message: `Review text cannot exceed ${MAX_REVIEW_LENGTH} characters`,
            });
        }

        const parentReviewId =
            req.body.parentReviewId === undefined || req.body.parentReviewId === null
                ? null
                : parsePositiveInt(req.body.parentReviewId);

        if (req.body.parentReviewId !== undefined && req.body.parentReviewId !== null && !parentReviewId) {
            return res.status(400).json({ message: "Invalid parent review ID" });
        }

        if (parentReviewId) {
            const parentReview = await pool.query(
                "SELECT review_id FROM paper_reviews WHERE review_id = $1 AND paper_id = $2",
                [parentReviewId, req.paperId]
            );
            if (parentReview.rows.length === 0) {
                return res.status(400).json({ message: "Parent review does not belong to this paper" });
            }
        }

        const insertedReview = await pool.query(
            `
            INSERT INTO paper_reviews (paper_id, author_id, parent_review_id, body)
            VALUES ($1, $2, $3, $4)
            RETURNING review_id
            `,
            [req.paperId, req.user.id, parentReviewId, body]
        );

        const createdReview = await pool.query(
            `
            SELECT
                pr.review_id,
                pr.paper_id,
                pr.author_id,
                pr.parent_review_id,
                pr.body,
                pr.visibility_scope,
                pr.created_at,
                pr.updated_at,
                u.name AS author_name,
                u.role AS author_role
            FROM paper_reviews pr
            JOIN users u ON u.id = pr.author_id
            WHERE pr.review_id = $1
            `,
            [insertedReview.rows[0].review_id]
        );

        res.status(201).json(createdReview.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

const startServer = async () => {
    try {
        await ensureReviewSchema();
        app.listen(PORT, () => {
            console.log(`server has started on port ${PORT}`);
        });
    } catch (err) {
        console.error("Server startup failed", err);
        process.exit(1);
    }
};

startServer();
