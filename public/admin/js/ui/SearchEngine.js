export default class SearchEngine {
    constructor({ input, selector, onSearch, urlParam = "q" }) {
        this.input = document.querySelector(input);
        if (!this.input) return;

        this.selector = selector;
        this.onSearch = onSearch || function() {};
        this.urlParam = urlParam;

        // INITIAL: read from URL
        const params = new URLSearchParams(location.search);
        const initial = params.get(this.urlParam) || "";
        this.input.value = initial;

        // If initial search exists → apply it
        this._search();

        this.input.addEventListener("input", () => this._search());
    }

    _writeURL(value) {
        const url = new URL(window.location);

        if (value) {
            url.searchParams.set(this.urlParam, value);
        } else {
            url.searchParams.delete(this.urlParam);
        }

        history.replaceState({}, "", url);
    }

    _search() {
        const value = this.input.value.toLowerCase();

        // 🔥 Write URL (THIS WAS THE MISSING PART)
        this._writeURL(value);

        const allCards = [...document.querySelectorAll(this.selector)];

        const results = allCards.filter(card =>
            card.textContent.toLowerCase().includes(value)
        );

        this.onSearch(results);
    }
}
