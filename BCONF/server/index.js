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
const MAX_ANTI_BID_REASON_LENGTH = 1000;

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

const isChair = (user) => user.role === "admin" || user.role === "deputy";

const fetchPaperById = async (paperId) => {
    const paper = await pool.query("SELECT * FROM papers WHERE paper_id = $1", [paperId]);
    return paper.rows[0] || null;
};

const isAssignedReviewer = async (paperId, reviewerId) => {
    const assignment = await pool.query(
        "SELECT 1 FROM paper_assignments WHERE paper_id = $1 AND reviewer_id = $2",
        [paperId, reviewerId]
    );
    return assignment.rows.length > 0;
};

const getReviewerAliasMap = async (paperId, fallbackReviewerIds = []) => {
    const aliasRows = await pool.query(
        `
        SELECT reviewer_id
        FROM paper_assignments
        WHERE paper_id = $1
        ORDER BY created_at ASC, reviewer_id ASC
        `,
        [paperId]
    );

    const seen = new Set();
    const orderedIds = [];

    for (const row of aliasRows.rows) {
        if (!seen.has(row.reviewer_id)) {
            seen.add(row.reviewer_id);
            orderedIds.push(row.reviewer_id);
        }
    }

    for (const reviewerId of fallbackReviewerIds) {
        if (!seen.has(reviewerId)) {
            seen.add(reviewerId);
            orderedIds.push(reviewerId);
        }
    }

    const aliasMap = new Map();
    orderedIds.forEach((reviewerId, index) => {
        aliasMap.set(reviewerId, `Reviewer ${index + 1}`);
    });

    return aliasMap;
};

const ensureConferenceSchema = async () => {
    await pool.query(`
        ALTER TABLE papers
        ADD COLUMN IF NOT EXISTS title VARCHAR(255)
    `);

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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS paper_bids (
            bid_id BIGSERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
            reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            locked_at TIMESTAMP,
            UNIQUE (paper_id, reviewer_id)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_bids_paper_idx
        ON paper_bids (paper_id, created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_bids_reviewer_idx
        ON paper_bids (reviewer_id, created_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS paper_assignments (
            assignment_id BIGSERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
            reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            assigned_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (paper_id, reviewer_id)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_assignments_paper_idx
        ON paper_assignments (paper_id, created_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_assignments_reviewer_idx
        ON paper_assignments (reviewer_id, created_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS paper_assignment_feedback (
            feedback_id BIGSERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
            reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            anti_bid BOOLEAN NOT NULL DEFAULT FALSE,
            reason TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (paper_id, reviewer_id)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_assignment_feedback_paper_idx
        ON paper_assignment_feedback (paper_id, updated_at DESC)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_assignment_feedback_reviewer_idx
        ON paper_assignment_feedback (reviewer_id, updated_at DESC)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS best_paper_votes (
            vote_id BIGSERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL REFERENCES papers(paper_id) ON DELETE CASCADE,
            reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (paper_id, reviewer_id)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS best_paper_votes_paper_idx
        ON best_paper_votes (paper_id)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS best_paper_votes_reviewer_idx
        ON best_paper_votes (reviewer_id)
    `);
};

app.post("/papers", protect, upload.single("pdf"), async (req, res) => {
    try {
        if (req.user.role === "reviewer") {
            return res.status(403).json({ message: "Reviewers cannot submit papers" });
        }

        const rawTitle = typeof req.body.title === "string" ? req.body.title.trim() : "";
        const rawDescription = typeof req.body.description === "string" ? req.body.description.trim() : "";

        if (!rawTitle || !rawDescription) {
            return res.status(400).json({ message: "Title and description are required" });
        }

        const pdfPath = req.file ? `uploads/${req.file.filename}` : null;
        const newPaper = await pool.query(
            "INSERT INTO papers (title, author, description, pdf_path, author_id) VALUES($1, $2, $3, $4, $5) RETURNING *",
            [rawTitle, req.user.name, rawDescription, pdfPath, req.user.id]
        );

        res.status(201).json(newPaper.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers", protect, async (req, res) => {
    try {
        if (isChair(req.user)) {
            const allPapers = await pool.query(
                `
                SELECT
                    p.paper_id,
                    p.title,
                    p.author,
                    p.description,
                    p.pdf_path,
                    p.created_at,
                    p.author_id,
                    COUNT(DISTINCT pa.reviewer_id)::INT AS assignment_count,
                    COUNT(DISTINCT pb.reviewer_id)::INT AS bid_count
                FROM papers p
                LEFT JOIN paper_assignments pa ON pa.paper_id = p.paper_id
                LEFT JOIN paper_bids pb ON pb.paper_id = p.paper_id
                GROUP BY p.paper_id
                ORDER BY p.created_at DESC
                `
            );
            return res.json(allPapers.rows);
        }

        if (req.user.role === "reviewer") {
            const settings = await getConferenceSettings();
            const reviewType = settings.review_type || "double_blind";
            const shouldShowAuthor = reviewType === "single_blind" || reviewType === "open";

            const reviewerPaperList = await pool.query(
                `
                SELECT
                    p.paper_id,
                    p.title,
                    CASE 
                        WHEN $2 AND (
                                (p.author_id = $1) OR
                                EXISTS (
                                    SELECT 1
                                    FROM paper_assignments pa
                                    WHERE pa.paper_id = p.paper_id
                                      AND pa.reviewer_id = $1
                                )
                             ) THEN p.author
                        ELSE NULL
                    END AS author,
                    p.description,
                    p.created_at,
                    (p.author_id = $1) AS is_authored_by_me,
                    EXISTS (
                        SELECT 1
                        FROM paper_assignments pa
                        WHERE pa.paper_id = p.paper_id
                          AND pa.reviewer_id = $1
                    ) AS is_assigned,
                    EXISTS (
                        SELECT 1
                        FROM paper_bids pb
                        WHERE pb.paper_id = p.paper_id
                          AND pb.reviewer_id = $1
                    ) AS has_bid,
                    (
                        SELECT pb.locked_at
                        FROM paper_bids pb
                        WHERE pb.paper_id = p.paper_id
                          AND pb.reviewer_id = $1
                    ) AS bid_locked_at,
                    COALESCE(
                        (
                            SELECT paf.anti_bid
                            FROM paper_assignment_feedback paf
                            WHERE paf.paper_id = p.paper_id
                              AND paf.reviewer_id = $1
                        ),
                        FALSE
                    ) AS anti_bid,
                    (
                        SELECT paf.reason
                        FROM paper_assignment_feedback paf
                        WHERE paf.paper_id = p.paper_id
                          AND paf.reviewer_id = $1
                    ) AS anti_bid_reason
                FROM papers p
                ORDER BY p.created_at DESC
                `,
                [req.user.id, shouldShowAuthor]
            );

            const response = reviewerPaperList.rows.map((paper) => ({
                ...paper,
                bid_locked: Boolean(paper.bid_locked_at),
            }));

            return res.json(response);
        }

        const ownPapers = await pool.query(
            `
            SELECT paper_id, title, author, description, pdf_path, created_at, author_id
            FROM papers
            WHERE author_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        return res.json(ownPapers.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers/:id", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (isChair(req.user)) {
            return res.json(paper);
        }

        if (req.user.role === "author" && paper.author_id === req.user.id) {
            return res.json(paper);
        }

        if (req.user.role === "reviewer") {
            const isAuthorOfPaper = paper.author_id === req.user.id;
            if (isAuthorOfPaper) {
                return res.json({
                    paper_id: paper.paper_id,
                    title: paper.title,
                    description: paper.description,
                    pdf_path: paper.pdf_path,
                    created_at: paper.created_at,
                    is_assigned: false,
                    is_authored_by_me: true,
                    anti_bid: false,
                    anti_bid_reason: null,
                });
            }

            const assigned = await isAssignedReviewer(paperId, req.user.id);
            if (!assigned) {
                return res.status(404).json({ message: "Paper not found or access denied" });
            }

            const feedback = await pool.query(
                `
                SELECT anti_bid, reason
                FROM paper_assignment_feedback
                WHERE paper_id = $1 AND reviewer_id = $2
                `,
                [paperId, req.user.id]
            );

            const bestPaperVote = await pool.query(
                `
                SELECT vote_id FROM best_paper_votes
                WHERE paper_id = $1 AND reviewer_id = $2
                `,
                [paperId, req.user.id]
            );

            const feedbackRow = feedback.rows[0] || { anti_bid: false, reason: null };

            // determine whether to include author name based on review type
            const settings = await getConferenceSettings();
            const reviewType = settings.review_type || "double_blind";
            const showAuthorName = reviewType === "single_blind" || reviewType === "open";

            const result = {
                paper_id: paper.paper_id,
                title: paper.title,
                description: paper.description,
                pdf_path: paper.pdf_path,
                created_at: paper.created_at,
                is_assigned: true,
                is_authored_by_me: false,
                anti_bid: feedbackRow.anti_bid,
                anti_bid_reason: feedbackRow.reason,
                best_paper_vote: bestPaperVote.rows.length > 0,
            };  

            if (showAuthorName) {
                result.author = paper.author;
                result.author_id = paper.author_id;
            }

            return res.json(result);
        }

        return res.status(403).json({ message: "Access denied" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/papers/:id", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (!isChair(req.user) && paper.author_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        const nextTitle =
            req.body.title === undefined ? paper.title : typeof req.body.title === "string" ? req.body.title.trim() : "";
        const nextDescription =
            req.body.description === undefined
                ? paper.description
                : typeof req.body.description === "string"
                  ? req.body.description.trim()
                  : "";

        if (!nextTitle || !nextDescription) {
            return res.status(400).json({ message: "Title and description cannot be empty" });
        }

        const updatedPaper = await pool.query(
            `
            UPDATE papers
            SET title = $1, description = $2
            WHERE paper_id = $3
            RETURNING *
            `,
            [nextTitle, nextDescription, paperId]
        );

        res.json(updatedPaper.rows[0]);
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

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (!isChair(req.user) && paper.author_id !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        await pool.query("DELETE FROM papers WHERE paper_id = $1", [paperId]);
        res.json({ message: "Paper was deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/papers/:id/bid", protect, async (req, res) => {
    try {
        if (req.user.role !== "reviewer") {
            return res.status(403).json({ message: "Only reviewers can bid" });
        }

        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (paper.author_id === req.user.id) {
            return res.status(403).json({ message: "You cannot bid on your own paper" });
        }

        const assigned = await isAssignedReviewer(paperId, req.user.id);
        if (assigned) {
            return res.status(400).json({ message: "Bidding is only available before assignment" });
        }

        const existingBid = await pool.query(
            "SELECT locked_at FROM paper_bids WHERE paper_id = $1 AND reviewer_id = $2",
            [paperId, req.user.id]
        );

        if (existingBid.rows.length > 0 && existingBid.rows[0].locked_at) {
            return res.status(400).json({ message: "Bid is locked after assignment" });
        }

        const bid = await pool.query(
            `
            INSERT INTO paper_bids (paper_id, reviewer_id)
            VALUES ($1, $2)
            ON CONFLICT (paper_id, reviewer_id)
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING bid_id, paper_id, reviewer_id, created_at, updated_at, locked_at
            `,
            [paperId, req.user.id]
        );

        res.status(201).json(bid.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/papers/:id/bid", protect, async (req, res) => {
    try {
        if (req.user.role !== "reviewer") {
            return res.status(403).json({ message: "Only reviewers can remove bids" });
        }

        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const assigned = await isAssignedReviewer(paperId, req.user.id);
        if (assigned) {
            return res.status(400).json({ message: "Assigned reviewers cannot remove locked bids" });
        }

        const deleted = await pool.query(
            `
            DELETE FROM paper_bids
            WHERE paper_id = $1
              AND reviewer_id = $2
              AND locked_at IS NULL
            RETURNING bid_id
            `,
            [paperId, req.user.id]
        );

        if (deleted.rows.length === 0) {
            const existingBid = await pool.query(
                "SELECT locked_at FROM paper_bids WHERE paper_id = $1 AND reviewer_id = $2",
                [paperId, req.user.id]
            );

            if (existingBid.rows.length > 0 && existingBid.rows[0].locked_at) {
                return res.status(400).json({ message: "Bid is locked after assignment" });
            }

            return res.status(404).json({ message: "No bid found for this paper" });
        }

        res.json({ message: "Bid removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/papers/:id/anti-bid", protect, async (req, res) => {
    try {
        if (req.user.role !== "reviewer") {
            return res.status(403).json({ message: "Only reviewers can submit anti-bids" });
        }

        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const assigned = await isAssignedReviewer(paperId, req.user.id);
        if (!assigned) {
            return res.status(403).json({ message: "Anti-bid is only available after assignment" });
        }

        if (typeof req.body.antiBid !== "boolean") {
            return res.status(400).json({ message: "antiBid must be a boolean" });
        }

        const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
        if (reason.length > MAX_ANTI_BID_REASON_LENGTH) {
            return res.status(400).json({
                message: `Reason cannot exceed ${MAX_ANTI_BID_REASON_LENGTH} characters`,
            });
        }

        const antiBid = req.body.antiBid;
        const upserted = await pool.query(
            `
            INSERT INTO paper_assignment_feedback (paper_id, reviewer_id, anti_bid, reason)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (paper_id, reviewer_id)
            DO UPDATE SET
                anti_bid = EXCLUDED.anti_bid,
                reason = EXCLUDED.reason,
                updated_at = CURRENT_TIMESTAMP
            RETURNING paper_id, reviewer_id, anti_bid, reason, updated_at
            `,
            [paperId, req.user.id, antiBid, reason || null]
        );

        res.json(upserted.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/management/reviewers", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const reviewers = await pool.query(
            `
            SELECT id, name, email
            FROM users
            WHERE role = 'reviewer'
            ORDER BY name ASC, id ASC
            `
        );

        res.json(reviewers.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/management/papers", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const papers = await pool.query(
            `
            SELECT paper_id, title, author, description, created_at, author_id
            FROM papers
            ORDER BY created_at DESC
            `
        );

        const bids = await pool.query(
            `
            SELECT
                pb.paper_id,
                pb.reviewer_id,
                pb.created_at,
                pb.updated_at,
                pb.locked_at,
                u.name AS reviewer_name,
                u.email AS reviewer_email
            FROM paper_bids pb
            JOIN users u ON u.id = pb.reviewer_id
            ORDER BY pb.created_at DESC
            `
        );

        const assignments = await pool.query(
            `
            SELECT
                pa.paper_id,
                pa.reviewer_id,
                pa.assigned_by,
                pa.created_at AS assigned_at,
                u.name AS reviewer_name,
                u.email AS reviewer_email,
                COALESCE(paf.anti_bid, FALSE) AS anti_bid,
                paf.reason AS anti_bid_reason,
                paf.updated_at AS anti_bid_updated_at
            FROM paper_assignments pa
            JOIN users u ON u.id = pa.reviewer_id
            LEFT JOIN paper_assignment_feedback paf
                ON paf.paper_id = pa.paper_id
               AND paf.reviewer_id = pa.reviewer_id
            ORDER BY pa.created_at DESC
            `
        );

        const bestPaperVotes = await pool.query(
            `
            SELECT
                bpv.paper_id,
                bpv.reviewer_id,
                u.name AS reviewer_name,
                u.email AS reviewer_email,
                bpv.created_at
            FROM best_paper_votes bpv
            JOIN users u ON u.id = bpv.reviewer_id
            ORDER BY bpv.created_at DESC
            `
        );

        const paperMap = new Map();
        for (const paper of papers.rows) {
            paperMap.set(paper.paper_id, {
                ...paper,
                bids: [],
                assignments: [],
                best_paper_votes: [],
            });
        }

        for (const bid of bids.rows) {
            const target = paperMap.get(bid.paper_id);
            if (!target) {
                continue;
            }
            target.bids.push({
                reviewer_id: bid.reviewer_id,
                reviewer_name: bid.reviewer_name,
                reviewer_email: bid.reviewer_email,
                created_at: bid.created_at,
                updated_at: bid.updated_at,
                locked_at: bid.locked_at,
                is_locked: Boolean(bid.locked_at),
            });
        }

        for (const assignment of assignments.rows) {
            const target = paperMap.get(assignment.paper_id);
            if (!target) {
                continue;
            }
            target.assignments.push(assignment);
        }

        for (const vote of bestPaperVotes.rows) {
            const target = paperMap.get(vote.paper_id);
            if (!target) {
                continue;
            }
            target.best_paper_votes.push({
                reviewer_id: vote.reviewer_id,
                reviewer_name: vote.reviewer_name,
                reviewer_email: vote.reviewer_email,
                created_at: vote.created_at,
            });
        }

        res.json(Array.from(paperMap.values()));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/management/papers/:id/assignments", protect, async (req, res) => {
    const paperId = parsePositiveInt(req.params.id);
    const reviewerId = parsePositiveInt(req.body?.reviewerId);

    if (!isChair(req.user)) {
        return res.status(403).json({ message: "Access denied" });
    }

    if (!paperId || !reviewerId) {
        return res.status(400).json({ message: "Valid paperId and reviewerId are required" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const paper = await client.query("SELECT paper_id, author_id FROM papers WHERE paper_id = $1", [paperId]);
        if (paper.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Paper not found" });
        }

        const reviewer = await client.query("SELECT id, role FROM users WHERE id = $1", [reviewerId]);
        if (reviewer.rows.length === 0 || reviewer.rows[0].role !== "reviewer") {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Selected user is not a reviewer" });
        }

        if (paper.rows[0].author_id === reviewerId) {
            await client.query("ROLLBACK");
            return res.status(400).json({ message: "Cannot assign reviewer to their own paper" });
        }

        const assignment = await client.query(
            `
            INSERT INTO paper_assignments (paper_id, reviewer_id, assigned_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (paper_id, reviewer_id) DO NOTHING
            RETURNING assignment_id, paper_id, reviewer_id, assigned_by, created_at
            `,
            [paperId, reviewerId, req.user.id]
        );

        await client.query(
            `
            UPDATE paper_bids
            SET
                locked_at = COALESCE(locked_at, CURRENT_TIMESTAMP),
                updated_at = CURRENT_TIMESTAMP
            WHERE paper_id = $1 AND reviewer_id = $2
            `,
            [paperId, reviewerId]
        );

        await client.query("COMMIT");

        if (assignment.rows.length === 0) {
            return res.status(200).json({ message: "Reviewer already assigned" });
        }

        return res.status(201).json(assignment.rows[0]);
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ message: "Server error" });
    } finally {
        client.release();
    }
});

app.delete("/management/papers/:paperId/assignments/:reviewerId", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const paperId = parsePositiveInt(req.params.paperId);
        const reviewerId = parsePositiveInt(req.params.reviewerId);

        if (!paperId || !reviewerId) {
            return res.status(400).json({ message: "Invalid IDs" });
        }

        const removed = await pool.query(
            `
            DELETE FROM paper_assignments
            WHERE paper_id = $1 AND reviewer_id = $2
            RETURNING assignment_id
            `,
            [paperId, reviewerId]
        );

        if (removed.rows.length === 0) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        res.json({ message: "Assignment removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/papers/:id/ratings", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (!isChair(req.user) && paper.author_id === req.user.id) {
            return res.status(403).json({ message: "Authors cannot view ratings for their own papers" });
        }

        let canViewRatings = false;
        if (isChair(req.user)) {
            canViewRatings = true;
        } else if (req.user.role === "author") {
            canViewRatings = paper.author_id === req.user.id;
        } else if (req.user.role === "reviewer") {
            canViewRatings = await isAssignedReviewer(paperId, req.user.id);
        }

        if (!canViewRatings) {
            return res.status(404).json({ message: "Paper not found or access denied" });
        }

        const ratings = await pool.query(
            `
            SELECT r.id, r.paper_id, r.editor_id, r.rating, r.review, u.name AS reviewer_name
            FROM ratings r
            JOIN users u ON u.id = r.editor_id
            WHERE r.paper_id = $1
            ORDER BY r.id DESC
            `,
            [paperId]
        );

        if (isChair(req.user)) {
            return res.json(ratings.rows);
        }

        const settings = await getConferenceSettings();
        const reviewType = settings.review_type || "double_blind";

        const reviewerIds = ratings.rows.map((row) => row.editor_id);
        const aliasMap = await getReviewerAliasMap(paperId, reviewerIds);

        let anonymized;
        if (reviewType === "open") {
            anonymized = ratings.rows.map((row) => ({
                id: row.id,
                paper_id: row.paper_id,
                rating: row.rating,
                review: row.review,
                reviewer_name: row.reviewer_name,
            }));
        } else {
            anonymized = ratings.rows.map((row) => ({
                id: row.id,
                paper_id: row.paper_id,
                rating: row.rating,
                review: row.review,
                editor_id: row.editor_id,
                reviewer_label: aliasMap.get(row.editor_id) || "Reviewer",
            }));
        }

        res.json(anonymized);
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
            return res.status(403).json({ message: "Only assigned reviewers can add ratings" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        const assigned = await isAssignedReviewer(paperId, req.user.id);
        if (!assigned) {
            return res.status(403).json({ message: "Only assigned reviewers can add ratings" });
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

app.get("/papers/:id/reviews", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (!isChair(req.user) && paper.author_id === req.user.id) {
            return res.status(403).json({ message: "Authors cannot view discussion for their own papers" });
        }

        if (req.user.role === "author") {
            if (paper.author_id !== req.user.id) {
                return res.status(403).json({ message: "Access denied" });
            }
        } else if (req.user.role === "reviewer") {
            const canView = await isAssignedReviewer(paperId, req.user.id);
            if (!canView) {
                return res.status(403).json({ message: "Only assigned reviewers can view discussion" });
            }
        } else if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

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
            [paperId]
        );

        const settings = await getConferenceSettings();
        const reviewType = settings.review_type || "double_blind";

        const anonymized = await applyReviewAnonymization(reviews.rows, reviewType, paperId, isChair(req.user));

        res.json(anonymized);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/papers/:id/reviews", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (req.user.role === "author") {
            return res.status(403).json({ message: "Authors cannot post discussion" });
        }

        if (req.user.role === "reviewer") {
            const assigned = await isAssignedReviewer(paperId, req.user.id);
            if (!assigned) {
                return res.status(403).json({ message: "Only assigned reviewers can post discussion" });
            }
        } else if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

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
                [parentReviewId, paperId]
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
            [paperId, req.user.id, parentReviewId, body]
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

        if (isChair(req.user)) {
            return res.status(201).json(createdReview.rows[0]);
        }

        const row = createdReview.rows[0];
        const settings = await getConferenceSettings();
        const reviewType = settings.review_type || "double_blind";

        if (!isChair(req.user)) {
            const reviews = [row];
            const anonymized = await applyReviewAnonymization(reviews, reviewType, paperId, false);
            return res.status(201).json(anonymized[0]);
        }

        res.status(201).json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Best Paper Voting endpoints
app.post("/papers/:id/best-paper-vote", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        // Insert or update the best paper vote
        const vote = await pool.query(
            `
            INSERT INTO best_paper_votes (paper_id, reviewer_id)
            VALUES ($1, $2)
            ON CONFLICT (paper_id, reviewer_id) DO UPDATE
            SET updated_at = CURRENT_TIMESTAMP
            RETURNING *
            `,
            [paperId, req.user.id]
        );

        res.status(201).json({ success: true, vote: vote.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/papers/:id/best-paper-vote", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }


        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }


        // Delete the best paper vote
        await pool.query(
            "DELETE FROM best_paper_votes WHERE paper_id = $1 AND reviewer_id = $2",
            [paperId, req.user.id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

//Review types section

const applyReviewAnonymization = async (review, reviewType, paperId, isChairUser) => {
    if (reviewType === "open") {
        return review;
    }

    if (isChairUser) {
        return review;
    }

    if (reviewType === "single_blind") {
        const reviewerIds = review
            .filter((row) => row.author_role === "reviewer")
            .map((row) => row.author_id);
        const aliasMap = await getReviewerAliasMap(paperId, reviewerIds);

        return review.map((row) => {
            let displayName = row.author_name;
            if (row.author_role === "reviewer") {
                displayName = aliasMap.get(row.author_id) || "Reviewer";
            } else if (row.author_role === "admin" || row.author_role === "deputy") {
                displayName = "Chair";
            }
            return { ...row, author_name: displayName };
        });
    }
    
    if (reviewType === "double_blind") {
        const allReviewerIds = review.map((row) => row.author_id);
        const aliasMap = await getReviewerAliasMap(paperId, allReviewerIds);

        const paperAuthorId = (await fetchPaperById(paperId)).author_id;
        if (!aliasMap.has(paperAuthorId)) {
            aliasMap.set(paperAuthorId, "Author");
        }

        return review.map((row) => {
            let displayName = row.author_name;
            if (row.author_role === "reviewer") {
                displayName = aliasMap.get(row.author_id) || "Reviewer";
            } else if (row.author_role === "author") {
                displayName = aliasMap.get(row.author_id) || "Author";
            } else if (row.author_role === "admin" || row.author_role === "deputy") {
                displayName = "Chair";
            }

            return { ...row, author_name: displayName };
        });
    }
    return review;
};
    
const getConferenceSettings = async () => {
    const res = await pool.query("SELECT review_type FROM conference_settings LIMIT 1");
    return res.rows[0] || { review_type: "double_blind" };
};

app.get("/management/settings/review-type", protect, async (req, res) => {
    try {
        const settings = await getConferenceSettings();
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/management/settings/review-type", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { review_type } = req.body;
        const validReviewTypes = ["single_blind", "double_blind", "open"];

        if (!review_type || !validReviewTypes.includes(review_type)) {
            return res.status(400).json({ message: "Invalid review type" });
        }

        const updated = await pool.query(
            "UPDATE conference_settings SET review_type = $1 RETURNING id, review_type",
            [review_type]
        );

        if (updated.rows.length === 0) {
            const created = await pool.query(
                "INSERT INTO conference_settings (review_type) VALUES ($1) RETURNING id, review_type",
                [review_type]
            );
            return res.json(created.rows[0]);
        }

        res.json(updated.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});


const startServer = async () => {
    try {
        await ensureConferenceSchema();
        app.listen(PORT, () => {
            console.log(`server has started on port ${PORT}`);
        });
    } catch (err) {
        console.error("Server startup failed", err);
        process.exit(1);
    }
};

startServer();
