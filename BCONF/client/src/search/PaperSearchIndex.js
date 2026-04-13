import SearchIndex from "./SearchIndex";

class PaperSearchIndex extends SearchIndex {
    static getReviewerStatusLabel(paper) {
        if (paper.is_assigned) {
            return paper.anti_bid ? "Assigned (Anti-bid submitted)" : "Assigned";
        }

        if (paper.bid_locked) {
            return "Bid locked";
        }

        if (paper.has_bid) {
            return "Interested";
        }

        if (paper.is_authored_by_me) {
            return "Authored by you";
        }

        return "";
    }

    getSearchableSegments(paper) {
        return [
            { text: paper.title, weight: 5 },
            { text: paper.author, weight: 3 },
            { text: paper.description, weight: 2 },
            { text: PaperSearchIndex.getReviewerStatusLabel(paper), weight: 2 },
            { text: paper.paper_id ? `paper ${paper.paper_id}` : "", weight: 1 },
        ];
    }
}

export default PaperSearchIndex;
