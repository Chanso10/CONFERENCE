class SearchIndex {
    constructor(records = []) {
        this.setRecords(records);
    }

    setRecords(records = []) {
        const normalizedRecords = Array.isArray(records) ? records : [];
        this.records = normalizedRecords;
        this.indexedRecords = normalizedRecords.map((record, position) => this.createEntry(record, position));
    }

    search(rawQuery) {
        const query = this.normalize(rawQuery);
        if (!query) {
            return [...this.records];
        }

        const tokens = this.tokenize(query);

        return this.indexedRecords
            .map((entry) => ({
                entry,
                score: this.scoreEntry(entry, query, tokens),
            }))
            .filter((result) => result.score > 0)
            .sort((left, right) => right.score - left.score || left.entry.position - right.entry.position)
            .map((result) => result.entry.record);
    }

    createEntry(record, position) {
        const segments = this.getSearchableSegments(record)
            .map((segment) => this.normalizeSegment(segment))
            .filter(Boolean);

        return {
            position,
            record,
            segments,
            text: segments.map((segment) => segment.text).join(" ").trim(),
        };
    }

    getSearchableSegments(record) {
        return [{ text: JSON.stringify(record), weight: 1 }];
    }

    normalizeSegment(segment) {
        if (!segment || segment.text === undefined || segment.text === null) {
            return null;
        }

        const text = this.normalize(segment.text);
        if (!text) {
            return null;
        }

        const weight = Number(segment.weight);

        return {
            text,
            words: text.split(" "),
            weight: Number.isFinite(weight) ? weight : 1,
        };
    }

    scoreEntry(entry, query, tokens) {
        if (!tokens.every((token) => entry.text.includes(token))) {
            return 0;
        }

        let score = entry.text.includes(query) ? 6 : 0;

        for (const segment of entry.segments) {
            if (segment.text === query) {
                score += 24 * segment.weight;
            } else if (segment.text.startsWith(query)) {
                score += 14 * segment.weight;
            } else if (segment.text.includes(query)) {
                score += 8 * segment.weight;
            }

            for (const token of tokens) {
                if (segment.words.some((word) => word.startsWith(token))) {
                    score += 5 * segment.weight;
                } else if (segment.text.includes(token)) {
                    score += 2 * segment.weight;
                }
            }
        }

        return score;
    }

    tokenize(query) {
        return this.normalize(query)
            .split(" ")
            .filter(Boolean);
    }

    normalize(value) {
        return String(value ?? "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ");
    }
}

export default SearchIndex;
