export const DEFAULT_WELCOME_CONTENT = Object.freeze({
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

const normalizeString = (value, fallback) => {
    if (typeof value !== "string") {
        return fallback;
    }

    const trimmed = value.trim();
    return trimmed || fallback;
};

const normalizeList = (value, fallback) => {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const cleaned = value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);

    return cleaned.length > 0 ? cleaned : fallback;
};

const normalizeFaqItems = (value, fallback) => {
    if (!Array.isArray(value)) {
        return fallback;
    }

    const cleaned = value
        .map((item) => {
            if (!item || typeof item !== "object") {
                return null;
            }

            const question = normalizeString(item.question, "");
            const answer = normalizeString(item.answer, "");

            if (!question || !answer) {
                return null;
            }

            return { question, answer };
        })
        .filter(Boolean);

    return cleaned.length > 0 ? cleaned : fallback;
};

export const normalizeWelcomeContent = (content = {}) => ({
    conference_name: normalizeString(content.conference_name, DEFAULT_WELCOME_CONTENT.conference_name),
    conference_tagline: normalizeString(
        content.conference_tagline,
        DEFAULT_WELCOME_CONTENT.conference_tagline
    ),
    hero_description: normalizeString(
        content.hero_description,
        DEFAULT_WELCOME_CONTENT.hero_description
    ),
    event_dates: normalizeString(content.event_dates, DEFAULT_WELCOME_CONTENT.event_dates),
    location: normalizeString(content.location, DEFAULT_WELCOME_CONTENT.location),
    venue: normalizeString(content.venue, DEFAULT_WELCOME_CONTENT.venue),
    format: normalizeString(content.format, DEFAULT_WELCOME_CONTENT.format),
    audience: normalizeString(content.audience, DEFAULT_WELCOME_CONTENT.audience),
    overview: normalizeString(content.overview, DEFAULT_WELCOME_CONTENT.overview),
    submission_deadline: normalizeString(
        content.submission_deadline,
        DEFAULT_WELCOME_CONTENT.submission_deadline
    ),
    notification_date: normalizeString(
        content.notification_date,
        DEFAULT_WELCOME_CONTENT.notification_date
    ),
    registration_deadline: normalizeString(
        content.registration_deadline,
        DEFAULT_WELCOME_CONTENT.registration_deadline
    ),
    contact_email: normalizeString(content.contact_email, DEFAULT_WELCOME_CONTENT.contact_email),
    contact_note: normalizeString(content.contact_note, DEFAULT_WELCOME_CONTENT.contact_note),
    highlights: normalizeList(content.highlights, DEFAULT_WELCOME_CONTENT.highlights),
    tracks: normalizeList(content.tracks, DEFAULT_WELCOME_CONTENT.tracks),
    faq_items: normalizeFaqItems(content.faq_items, DEFAULT_WELCOME_CONTENT.faq_items),
});

export const listToTextarea = (items = []) => items.join("\n");

export const faqItemsToTextarea = (items = []) =>
    items.map((item) => `${item.question} | ${item.answer}`).join("\n");

export const parseTextareaList = (value) =>
    value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

export const parseFaqTextarea = (value) =>
    value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const separatorIndex = line.indexOf("|");
            if (separatorIndex === -1) {
                return null;
            }

            const question = line.slice(0, separatorIndex).trim();
            const answer = line.slice(separatorIndex + 1).trim();

            if (!question || !answer) {
                return null;
            }

            return { question, answer };
        })
        .filter(Boolean);
