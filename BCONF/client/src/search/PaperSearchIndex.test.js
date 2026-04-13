import PaperSearchIndex from "./PaperSearchIndex";

describe("PaperSearchIndex", () => {
    const papers = [
        {
            paper_id: 11,
            title: "Graph Neural Systems",
            author: "Ada Lovelace",
            description: "A study on reliable graph architectures.",
            is_assigned: false,
            has_bid: false,
            bid_locked: false,
            is_authored_by_me: false,
            anti_bid: false,
        },
        {
            paper_id: 12,
            title: "Distributed Review Workflow",
            author: "Grace Hopper",
            description: "Graph-based orchestration for reviewer assignment.",
            is_assigned: false,
            has_bid: true,
            bid_locked: false,
            is_authored_by_me: false,
            anti_bid: false,
        },
        {
            paper_id: 13,
            title: "Program Chairs at Scale",
            author: "Margaret Hamilton",
            description: "Operational guidance for conference committees.",
            is_assigned: true,
            has_bid: false,
            bid_locked: false,
            is_authored_by_me: false,
            anti_bid: true,
        },
    ];

    it("returns the original list when the query is empty", () => {
        const index = new PaperSearchIndex(papers);

        expect(index.search("   ")).toEqual(papers);
    });

    it("prioritizes stronger title matches ahead of description-only matches", () => {
        const index = new PaperSearchIndex(papers);

        const results = index.search("graph");

        expect(results.map((paper) => paper.paper_id)).toEqual([11, 12]);
    });

    it("matches reviewer status text regardless of casing", () => {
        const index = new PaperSearchIndex(papers);

        const results = index.search("anti BID submitted");

        expect(results.map((paper) => paper.paper_id)).toEqual([13]);
    });
});
