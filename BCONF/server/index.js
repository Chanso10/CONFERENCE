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
const MAX_PRESENTATION_TEXT_LENGTH = 160;
const MAX_PRESENTATION_NOTES_LENGTH = 1000;
const DEFAULT_WELCOME_PAGE_CONTENT = Object.freeze({
    conference_name: "BCONF 2026",
    conference_tagline: "A collaborative conference for authors, reviewers, and attendees.",
    hero_description:
        "Explore the event, follow important deadlines, and join the conference community through paper submissions, reviews, and attendee registration.",
    event_dates: "July 24-26, 2026",
    location: "Guatemala City, Guatemala",
    venue: "Central Convention Hall",
    format: "In-person event with online paper and review management",
    audience: "Researchers, reviewers, students, and general attendees",
    overview:
        "BCONF brings together scholarly submissions, thoughtful peer review, and event participation in one coordinated experience.",
    submission_deadline: "May 30, 2026",
    notification_date: "June 20, 2026",
    registration_deadline: "July 10, 2026",
    contact_email: "conference@example.com",
    contact_note: "Reach out for speaker, registration, or logistics questions.",
    highlights: [
        "Research presentations and paper discussions",
        "Structured reviewer coordination and deadlines",
        "Attendee registration for the broader conference community",
    ],
    tracks: [
        "AI and data-driven systems",
        "Human-centered computing",
        "Software engineering and infrastructure",
        "Interdisciplinary emerging topics",
    ],
    faq_items: [
        {
            question: "Who should register as an attendee?",
            answer:
                "Choose attendee registration if you plan to join the event but do not need paper submission or reviewer access.",
        },
        {
            question: "Do authors and reviewers use the same portal?",
            answer:
                "Yes. Submission, review, and conference management workflows are handled through the same BCONF portal.",
        },
        {
            question: "Can the conference details be updated later?",
            answer:
                "Yes. An admin can edit the welcome page settings at any time, and the public page will reflect those updates.",
        },
    ],
});

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

const sanitizeTextField = (value, fallback, maxLength = 500) => {
    if (typeof value !== "string") {
        return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return fallback;
    }

    return trimmed.slice(0, maxLength);
};

const sanitizeStringList = (value, fallback, options = {}) => {
    const {
        maxItems = 8,
        maxItemLength = 120,
    } = options;

    if (!Array.isArray(value)) {
        return fallback;
    }

    const cleaned = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
        .slice(0, maxItems)
        .map((item) => item.slice(0, maxItemLength));

    return cleaned.length > 0 ? cleaned : fallback;
};

const sanitizeFaqItems = (value, fallback) => {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const cleaned = value
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }

            const question = sanitizeTextField(item.question, "", 160);
            const answer = sanitizeTextField(item.answer, "", 600);

            if (!question || !answer) {
                return null;
            }

            return { question, answer };
        })
        .filter(Boolean)
        .slice(0, 6);

    return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeDateInput = (value) => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return null;
    }

    const parsed = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
        return null;
    }

    return trimmed;
};

const normalizeTimeInput = (value) => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    const match = trimmed.match(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/);
    return match ? trimmed.slice(0, 5) : null;
};

const sanitizeOptionalText = (value, maxLength) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : null;
};

const sanitizeWelcomePageContent = (content = {}) => ({
    conference_name: sanitizeTextField(
        content.conference_name,
        DEFAULT_WELCOME_PAGE_CONTENT.conference_name,
        120
    ),
    conference_tagline: sanitizeTextField(
        content.conference_tagline,
        DEFAULT_WELCOME_PAGE_CONTENT.conference_tagline,
        180
    ),
    hero_description: sanitizeTextField(
        content.hero_description,
        DEFAULT_WELCOME_PAGE_CONTENT.hero_description,
        600
    ),
    event_dates: sanitizeTextField(
        content.event_dates,
        DEFAULT_WELCOME_PAGE_CONTENT.event_dates,
        120
    ),
    location: sanitizeTextField(
        content.location,
        DEFAULT_WELCOME_PAGE_CONTENT.location,
        120
    ),
    venue: sanitizeTextField(
        content.venue,
        DEFAULT_WELCOME_PAGE_CONTENT.venue,
        120
    ),
    format: sanitizeTextField(
        content.format,
        DEFAULT_WELCOME_PAGE_CONTENT.format,
        160
    ),
    audience: sanitizeTextField(
        content.audience,
        DEFAULT_WELCOME_PAGE_CONTENT.audience,
        200
    ),
    overview: sanitizeTextField(
        content.overview,
        DEFAULT_WELCOME_PAGE_CONTENT.overview,
        900
    ),
    submission_deadline: sanitizeTextField(
        content.submission_deadline,
        DEFAULT_WELCOME_PAGE_CONTENT.submission_deadline,
        120
    ),
    notification_date: sanitizeTextField(
        content.notification_date,
        DEFAULT_WELCOME_PAGE_CONTENT.notification_date,
        120
    ),
    registration_deadline: sanitizeTextField(
        content.registration_deadline,
        DEFAULT_WELCOME_PAGE_CONTENT.registration_deadline,
        120
    ),
    contact_email: sanitizeTextField(
        content.contact_email,
        DEFAULT_WELCOME_PAGE_CONTENT.contact_email,
        160
    ),
    contact_note: sanitizeTextField(
        content.contact_note,
        DEFAULT_WELCOME_PAGE_CONTENT.contact_note,
        300
    ),
    highlights: sanitizeStringList(
        content.highlights,
        DEFAULT_WELCOME_PAGE_CONTENT.highlights,
        { maxItems: 6, maxItemLength: 120 }
    ),
    tracks: sanitizeStringList(
        content.tracks,
        DEFAULT_WELCOME_PAGE_CONTENT.tracks,
        { maxItems: 8, maxItemLength: 120 }
    ),
    faq_items: sanitizeFaqItems(content.faq_items, DEFAULT_WELCOME_PAGE_CONTENT.faq_items),
});

const isChair = (user) => user.role === "admin" || user.role === "deputy";
const isPaperWorkflowUser = (user) => ["author", "reviewer", "admin", "deputy"].includes(user.role);
const canSubmitPapers = (user) => ["author", "admin", "deputy"].includes(user.role);

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
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS first_name VARCHAR(100)
    `);

    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_name VARCHAR(100)
    `);

    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS institution VARCHAR(150)
    `);

    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS pronouns VARCHAR(100)
    `);

    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS allergies TEXT
    `);

    await pool.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
    `);

    await pool.query(`
        ALTER TABLE papers
        ADD COLUMN IF NOT EXISTS title VARCHAR(255)
    `);

    await pool.query(`
        ALTER TABLE papers
        ADD COLUMN IF NOT EXISTS approval VARCHAR(16) NOT NULL DEFAULT 'pending'
    `);

    try {
        await pool.query(`
            ALTER TABLE ratings
            ALTER COLUMN rating TYPE VARCHAR(50)
            USING rating::TEXT
        `);

        await pool.query(`
            UPDATE ratings
            SET rating = CASE rating
                WHEN '1' THEN 'Reject'
                WHEN '2' THEN 'Lean to Reject'
                WHEN '3' THEN 'Lean to Accept'
                WHEN '4' THEN 'Accept with Revisions'
                WHEN '5' THEN 'Accept'
                ELSE rating
            END
        `);
    } catch (err) {
        // Ratings table may not exist yet or may already be text
    }

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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS paper_presentations (
            presentation_id BIGSERIAL PRIMARY KEY,
            paper_id INTEGER NOT NULL UNIQUE REFERENCES papers(paper_id) ON DELETE CASCADE,
            presentation_date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME,
            room VARCHAR(160),
            session_title VARCHAR(160),
            notes TEXT,
            scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT paper_presentations_time_order CHECK (end_time IS NULL OR end_time > start_time)
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_presentations_date_time_idx
        ON paper_presentations (presentation_date, start_time)
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS paper_presentations_paper_idx
        ON paper_presentations (paper_id)
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS conference_settings (
            id SERIAL PRIMARY KEY,
            review_type VARCHAR(20)
                CHECK (review_type IN ('single_blind', 'double_blind', 'open'))
                NOT NULL DEFAULT 'double_blind',
            landing_page_content JSONB NOT NULL DEFAULT '{}'::jsonb,
            landing_page_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            landing_page_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        ALTER TABLE conference_settings
        ADD COLUMN IF NOT EXISTS review_type VARCHAR(20)
            CHECK (review_type IN ('single_blind', 'double_blind', 'open'))
    `);

    await pool.query(`
        ALTER TABLE conference_settings
        ALTER COLUMN review_type SET DEFAULT 'double_blind'
    `);

    await pool.query(`
        UPDATE conference_settings
        SET review_type = 'double_blind'
        WHERE review_type IS NULL
    `);

    await pool.query(`
        ALTER TABLE conference_settings
        ALTER COLUMN review_type SET NOT NULL
    `);

    await pool.query(`
        ALTER TABLE conference_settings
        ADD COLUMN IF NOT EXISTS landing_page_content JSONB NOT NULL DEFAULT '{}'::jsonb
    `);

    await pool.query(`
        ALTER TABLE conference_settings
        ADD COLUMN IF NOT EXISTS landing_page_updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    await pool.query(`
        ALTER TABLE conference_settings
        ADD COLUMN IF NOT EXISTS landing_page_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS conference_review_directions (
            id SERIAL PRIMARY KEY,
            directions TEXT,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

const csvEscape = (value) => {
    if (value === null || value === undefined) {
        return "";
    }
    const text = String(value);
    return `"${text.replace(/"/g, '""')}"`;
};

const exportQueryMap = {
    attendees: {
        sql: `
            SELECT first_name, last_name, email
            FROM users
            WHERE role = 'attendee'
            ORDER BY last_name NULLS LAST, first_name NULLS LAST, email ASC
        `,
        headers: ["first_name", "last_name", "email"],
    },
    authors: {
        sql: `
            SELECT first_name, last_name, email
            FROM users
            WHERE role = 'author'
            ORDER BY last_name NULLS LAST, first_name NULLS LAST, email ASC
        `,
        headers: ["first_name", "last_name", "email"],
    },
    reviewers: {
        sql: `
            SELECT first_name, last_name, email
            FROM users
            WHERE role = 'reviewer'
            ORDER BY last_name NULLS LAST, first_name NULLS LAST, email ASC
        `,
        headers: ["first_name", "last_name", "email"],
    },
    papers: {
        sql: `
            SELECT p.title, p.approval, u.first_name, u.last_name, u.email
            FROM papers p
            JOIN users u ON u.id = p.author_id
            ORDER BY p.title ASC
        `,
        headers: ["title", "approval", "first_name", "last_name", "email"],
    },
    approved_papers: {
        sql: `
            SELECT p.title, p.approval, u.first_name, u.last_name, u.email
            FROM papers p
            JOIN users u ON u.id = p.author_id
            WHERE LOWER(p.approval) = 'approved'
            ORDER BY p.title ASC
        `,
        headers: ["title", "approval", "first_name", "last_name", "email"],
    },
    denied_papers: {
        sql: `
            SELECT p.title, p.approval, u.first_name, u.last_name, u.email
            FROM papers p
            JOIN users u ON u.id = p.author_id
            WHERE LOWER(p.approval) = 'denied'
            ORDER BY p.title ASC
        `,
        headers: ["title", "approval", "first_name", "last_name", "email"],
    },
    awaiting_changes_papers: {
        sql: `
            SELECT p.title, p.approval, u.first_name, u.last_name, u.email
            FROM papers p
            JOIN users u ON u.id = p.author_id
            WHERE LOWER(p.approval) = 'awaiting changes'
            ORDER BY p.title ASC
        `,
        headers: ["title", "approval", "first_name", "last_name", "email"],
    },
    pending_papers: {
        sql: `
            SELECT p.title, p.approval, u.first_name, u.last_name, u.email
            FROM papers p
            JOIN users u ON u.id = p.author_id
            WHERE LOWER(p.approval) = 'pending'
            ORDER BY p.title ASC
        `,
        headers: ["title", "approval", "first_name", "last_name", "email"],
    },
};

app.get("/management/export", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const exportType = (req.query.type || "").toString();
        const exportConfig = exportQueryMap[exportType];

        if (!exportConfig) {
            return res.status(400).json({ message: "Invalid export type" });
        }

        const results = await pool.query(exportConfig.sql);
        const rows = results.rows;
        const csvLines = [exportConfig.headers.join(",")];

        for (const row of rows) {
            csvLines.push(
                exportConfig.headers
                    .map((header) => csvEscape(row[header]))
                    .join(",")
            );
        }

        const filename = `bconf-${exportType}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csvLines.join("\r\n"));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.post("/papers", protect, upload.single("pdf"), async (req, res) => {
    try {
        if (!canSubmitPapers(req.user)) {
            return res.status(403).json({ message: "Only authors and chairs can submit papers" });
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
        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
        }

        if (isChair(req.user)) {
            const allPapers = await pool.query(
                `
                SELECT
                    p.paper_id,
                    p.title,
                    p.author,
                    u.email AS author_email,
                    p.description,
                    p.pdf_path,
                    p.created_at,
                    p.author_id,
                    p.approval,
                    COUNT(DISTINCT pa.reviewer_id)::INT AS assignment_count,
                    COUNT(DISTINCT pb.reviewer_id)::INT AS bid_count
                FROM papers p
                LEFT JOIN users u ON u.id = p.author_id
                LEFT JOIN paper_assignments pa ON pa.paper_id = p.paper_id
                LEFT JOIN paper_bids pb ON pb.paper_id = p.paper_id
                GROUP BY p.paper_id, u.email
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
                    p.approval,
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
            SELECT paper_id, title, author, description, pdf_path, created_at, author_id, approval
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

        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
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
                    approval: paper.approval,
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
                approval: paper.approval,
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

app.put("/papers/:id/approval", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Only chairs can update approval status" });
        }

        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const { approval } = req.body;
        const validApprovals = ["Pending", "Approved", "Denied","Awaiting Changes"];
        if (!validApprovals.includes(approval)) {
            return res.status(400).json({ message: "Invalid approval value" });
        }

        const updated = await pool.query(
            `
            UPDATE papers
            SET approval = $1
            WHERE paper_id = $2
            RETURNING *
            `,
            [approval, paperId]
        );

        if (updated.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }

        res.json(updated.rows[0]);
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

        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
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

        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
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
            SELECT p.paper_id, p.title, p.author, u.email AS author_email, p.description, p.created_at, p.author_id, p.approval
            FROM papers p
            LEFT JOIN users u ON u.id = p.author_id
            ORDER BY p.created_at DESC
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

app.get("/management/schedule", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const scheduledPapers = await pool.query(
            `
            SELECT
                p.paper_id,
                p.title,
                p.author,
                u.email AS author_email,
                p.description,
                p.approval,
                pp.presentation_id,
                to_char(pp.presentation_date, 'YYYY-MM-DD') AS presentation_date,
                to_char(pp.start_time, 'HH24:MI') AS start_time,
                to_char(pp.end_time, 'HH24:MI') AS end_time,
                pp.room,
                pp.session_title,
                pp.notes,
                pp.scheduled_by,
                scheduler.name AS scheduled_by_name,
                pp.updated_at AS schedule_updated_at
            FROM papers p
            LEFT JOIN users u ON u.id = p.author_id
            LEFT JOIN paper_presentations pp ON pp.paper_id = p.paper_id
            LEFT JOIN users scheduler ON scheduler.id = pp.scheduled_by
            WHERE LOWER(COALESCE(p.approval, 'pending')) = 'approved'
            ORDER BY
                pp.presentation_date NULLS LAST,
                pp.start_time NULLS LAST,
                LOWER(COALESCE(p.title, '')) ASC,
                p.paper_id ASC
            `
        );

        res.json(scheduledPapers.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/management/schedule/:paperId", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const paperId = parsePositiveInt(req.params.paperId);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const presentationDate = normalizeDateInput(req.body?.presentationDate);
        const startTime = normalizeTimeInput(req.body?.startTime);
        const endTime = req.body?.endTime ? normalizeTimeInput(req.body.endTime) : null;
        const room = sanitizeOptionalText(req.body?.room, MAX_PRESENTATION_TEXT_LENGTH);
        const sessionTitle = sanitizeOptionalText(req.body?.sessionTitle, MAX_PRESENTATION_TEXT_LENGTH);
        const notes = sanitizeOptionalText(req.body?.notes, MAX_PRESENTATION_NOTES_LENGTH);

        if (!presentationDate || !startTime) {
            return res.status(400).json({ message: "Presentation date and start time are required" });
        }

        if (req.body?.endTime && !endTime) {
            return res.status(400).json({ message: "End time is invalid" });
        }

        if (endTime && endTime <= startTime) {
            return res.status(400).json({ message: "End time must be after start time" });
        }

        const paper = await pool.query(
            "SELECT paper_id, approval FROM papers WHERE paper_id = $1",
            [paperId]
        );

        if (paper.rows.length === 0) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if ((paper.rows[0].approval || "").toLowerCase() !== "approved") {
            return res.status(400).json({ message: "Only approved papers can be scheduled" });
        }

        const saved = await pool.query(
            `
            INSERT INTO paper_presentations (
                paper_id,
                presentation_date,
                start_time,
                end_time,
                room,
                session_title,
                notes,
                scheduled_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (paper_id)
            DO UPDATE SET
                presentation_date = EXCLUDED.presentation_date,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                room = EXCLUDED.room,
                session_title = EXCLUDED.session_title,
                notes = EXCLUDED.notes,
                scheduled_by = EXCLUDED.scheduled_by,
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                presentation_id,
                paper_id,
                to_char(presentation_date, 'YYYY-MM-DD') AS presentation_date,
                to_char(start_time, 'HH24:MI') AS start_time,
                to_char(end_time, 'HH24:MI') AS end_time,
                room,
                session_title,
                notes,
                scheduled_by,
                updated_at
            `,
            [paperId, presentationDate, startTime, endTime, room, sessionTitle, notes, req.user.id]
        );

        res.json(saved.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/management/schedule/:paperId", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const paperId = parsePositiveInt(req.params.paperId);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const removed = await pool.query(
            "DELETE FROM paper_presentations WHERE paper_id = $1 RETURNING presentation_id",
            [paperId]
        );

        if (removed.rows.length === 0) {
            return res.status(404).json({ message: "Schedule entry not found" });
        }

        res.json({ message: "Presentation slot cleared" });
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

        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
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
        const validRatings = [
            'Accept',
            'Accept with Revisions',
            'Lean to Accept',
            'Lean to Reject',
            'Reject',
        ];

        const ratingValue = typeof rating === 'string' ? rating.trim() : '';
        if (!validRatings.includes(ratingValue)) {
            return res.status(400).json({ message: 'Invalid rating option' });
        }

        const newRating = await pool.query(
            `
            INSERT INTO ratings (paper_id, editor_id, rating)
            VALUES ($1, $2, $3)
            RETURNING *
            `,
            [paperId, req.user.id, ratingValue]
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

        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
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

        if (!isPaperWorkflowUser(req.user)) {
            return res.status(403).json({ message: "Paper access is only available to authors, reviewers, and chairs" });
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

app.get("/papers/:id/meta-review", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        if (req.user.role === "author" && paper.author_id === req.user.id) {
            return res.status(403).json({ message: "Authors cannot view discussion for their own papers" });
        }

        if (req.user.role === "reviewer") {
            const canView = await isAssignedReviewer(paperId, req.user.id);
            if (!canView) {
                return res.status(403).json({ message: "Only assigned reviewers can view meta review" });
            }
        } else if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const result = await pool.query(
            `SELECT meta_review_id, paper_id, author_id, body, created_at, updated_at
             FROM paper_meta_reviews
             WHERE paper_id = $1`,
            [paperId]
        );

        if (result.rows.length === 0) {
            return res.json({ meta_review: null });
        }

        res.json({ meta_review: result.rows[0].body });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/papers/:id/meta-review", protect, async (req, res) => {
    try {
        const paperId = parsePositiveInt(req.params.id);
        if (!paperId) {
            return res.status(400).json({ message: "Invalid paper ID" });
        }

        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        const rawBody = typeof req.body.body === "string" ? req.body.body : "";
        const body = rawBody.trim();
        if (!body) {
            return res.status(400).json({ message: "Meta-review text is required" });
        }

        const existing = await pool.query(
            "SELECT meta_review_id FROM paper_meta_reviews WHERE paper_id = $1",
            [paperId]
        );

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE paper_meta_reviews
                 SET body = $1, updated_at = CURRENT_TIMESTAMP
                 WHERE paper_id = $2
                 RETURNING meta_review_id, paper_id, author_id, body, created_at, updated_at`,
                [body, paperId]
            );
        } else {
            result = await pool.query(
                `INSERT INTO paper_meta_reviews (paper_id, author_id, body)
                 VALUES ($1, $2, $3)
                 RETURNING meta_review_id, paper_id, author_id, body, created_at, updated_at`,
                [paperId, req.user.id, body]
            );
        }

        res.json({ meta_review: result.rows[0].body });
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

        if (req.user.role !== "reviewer") {
            return res.status(403).json({ message: "Only assigned reviewers can vote for best paper" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        const assigned = await isAssignedReviewer(paperId, req.user.id);
        if (!assigned) {
            return res.status(403).json({ message: "Only assigned reviewers can vote for best paper" });
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

        if (req.user.role !== "reviewer") {
            return res.status(403).json({ message: "Only assigned reviewers can vote for best paper" });
        }

        const paper = await fetchPaperById(paperId);
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        const assigned = await isAssignedReviewer(paperId, req.user.id);
        if (!assigned) {
            return res.status(403).json({ message: "Only assigned reviewers can vote for best paper" });
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
    const res = await pool.query(
        `SELECT review_type, landing_page_content, landing_page_updated_by, landing_page_updated_at
         FROM conference_settings
         LIMIT 1`
    );

    if (res.rows.length === 0) {
        return {
            review_type: "double_blind",
            landing_page_content: DEFAULT_WELCOME_PAGE_CONTENT,
            landing_page_updated_by: null,
            landing_page_updated_at: null,
        };
    }

    return {
        ...res.rows[0],
        landing_page_content: sanitizeWelcomePageContent(res.rows[0].landing_page_content || {}),
    };
};

const getWelcomePageSettings = async () => {
    const settings = await getConferenceSettings();

    return {
        content: settings.landing_page_content || DEFAULT_WELCOME_PAGE_CONTENT,
        updated_by: settings.landing_page_updated_by || null,
        updated_at: settings.landing_page_updated_at || null,
    };
};

app.get("/conference/welcome", async (req, res) => {
    try {
        const settings = await getWelcomePageSettings();
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/management/settings/welcome", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const settings = await getWelcomePageSettings();
        res.json(settings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/management/settings/welcome", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const nextContent = sanitizeWelcomePageContent(req.body?.content || req.body);

        const updated = await pool.query(
            `UPDATE conference_settings
             SET landing_page_content = $1::jsonb,
                 landing_page_updated_by = $2,
                 landing_page_updated_at = CURRENT_TIMESTAMP
             RETURNING landing_page_content, landing_page_updated_by, landing_page_updated_at`,
            [JSON.stringify(nextContent), req.user.id]
        );

        if (updated.rows.length === 0) {
            const created = await pool.query(
                `INSERT INTO conference_settings (landing_page_content, landing_page_updated_by)
                 VALUES ($1::jsonb, $2)
                 RETURNING landing_page_content, landing_page_updated_by, landing_page_updated_at`,
                [JSON.stringify(nextContent), req.user.id]
            );

            return res.json({
                content: sanitizeWelcomePageContent(created.rows[0].landing_page_content || {}),
                updated_by: created.rows[0].landing_page_updated_by || null,
                updated_at: created.rows[0].landing_page_updated_at || null,
            });
        }

        res.json({
            content: sanitizeWelcomePageContent(updated.rows[0].landing_page_content || {}),
            updated_by: updated.rows[0].landing_page_updated_by || null,
            updated_at: updated.rows[0].landing_page_updated_at || null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/management/settings/welcome", protect, async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Access denied" });
        }

        const resetContent = { ...DEFAULT_WELCOME_PAGE_CONTENT };

        const updated = await pool.query(
            `UPDATE conference_settings
             SET landing_page_content = $1::jsonb,
                 landing_page_updated_by = $2,
                 landing_page_updated_at = CURRENT_TIMESTAMP
             RETURNING landing_page_content, landing_page_updated_by, landing_page_updated_at`,
            [JSON.stringify(resetContent), req.user.id]
        );

        if (updated.rows.length === 0) {
            const created = await pool.query(
                `INSERT INTO conference_settings (landing_page_content, landing_page_updated_by)
                 VALUES ($1::jsonb, $2)
                 RETURNING landing_page_content, landing_page_updated_by, landing_page_updated_at`,
                [JSON.stringify(resetContent), req.user.id]
            );

            return res.json({
                content: sanitizeWelcomePageContent(created.rows[0].landing_page_content || {}),
                updated_by: created.rows[0].landing_page_updated_by || null,
                updated_at: created.rows[0].landing_page_updated_at || null,
            });
        }

        res.json({
            content: sanitizeWelcomePageContent(updated.rows[0].landing_page_content || {}),
            updated_by: updated.rows[0].landing_page_updated_by || null,
            updated_at: updated.rows[0].landing_page_updated_at || null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.get("/management/settings/review-type", protect, async (req, res) => {
    try {
        const settings = await getConferenceSettings();
        res.json({ review_type: settings.review_type });
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

// Review Directions Endpoints (Global Settings)

app.get("/management/settings/review-directions", protect, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, directions, created_by, updated_by, created_at, updated_at FROM conference_review_directions LIMIT 1"
        );

        if (result.rows.length === 0) {
            return res.json({ directions: null });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.put("/management/settings/review-directions", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        const { directions } = req.body;
        const directionsText = typeof directions === "string" ? directions.trim() : "";

        if (!directionsText) {
            return res.status(400).json({ message: "Directions cannot be empty" });
        }

        const existing = await pool.query(
            "SELECT id FROM conference_review_directions LIMIT 1"
        );

        let result;
        if (existing.rows.length > 0) {
            result = await pool.query(
                `UPDATE conference_review_directions 
                 SET directions = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
                 RETURNING id, directions, created_by, updated_by, created_at, updated_at`,
                [directionsText, req.user.id]
            );
        } else {
            result = await pool.query(
                `INSERT INTO conference_review_directions (directions, created_by, updated_by) 
                 VALUES ($1, $2, $2) 
                 RETURNING id, directions, created_by, updated_by, created_at, updated_at`,
                [directionsText, req.user.id]
            );
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.delete("/management/settings/review-directions", protect, async (req, res) => {
    try {
        if (!isChair(req.user)) {
            return res.status(403).json({ message: "Access denied" });
        }

        await pool.query(
            "UPDATE conference_review_directions SET directions = NULL, updated_at = CURRENT_TIMESTAMP, updated_by = $1",
            [req.user.id]
        );

        res.json({ message: "Directions deleted successfully" });
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
