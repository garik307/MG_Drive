export default class DataSearchEngine {
    constructor({ data, inputSelector, onSearch, urlParam = "q" }) {
        this.data = data || [];
        this.input = document.querySelector(inputSelector);
        this.onSearch = onSearch || function() {};
        this.urlParam = urlParam;

        if (!this.input) return;

        // Load initial from URL
        const params = new URLSearchParams(window.location.search);
        const initial = params.get(this.urlParam) || "";
        this.input.value = initial;

        // Initial search
        this._search();

        this.input.addEventListener("input", () => {
            this._search();
        });
    }

    updateData(newData) {
        this.data = newData || [];
        this._search();
    }

    _writeURL(value) {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(this.urlParam, value);
        } else {
            url.searchParams.delete(this.urlParam);
        }
        window.history.replaceState({}, "", url);
    }

    _search() {
        const value = this.input.value.toLowerCase().trim();
        this._writeURL(value);

        if (!value) {
            this.onSearch(this.data);
            return;
        }

        const results = this.data.filter(item => {
            const qText = (item.question || "").toLowerCase();
            const qNum = String(item.number || "");
            return qText.includes(value) || qNum.includes(value);
        });

        this.onSearch(results);
    }
}
