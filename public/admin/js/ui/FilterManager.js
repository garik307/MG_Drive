export default class FilterManager {
    constructor({ testSelect, groupSelect, selector, onFilter }) {
        this.testSelect = document.querySelector(testSelect);
        this.groupSelect = document.querySelector(groupSelect);
        this.selector = selector;
        this.onFilter = onFilter || function () {};

        if (!this.testSelect || !this.groupSelect) return;

        this.lastChanged = null;

        // Load from URL on startup
        this._loadFromUrl();

        this.testSelect.addEventListener("change", () => {
            this.lastChanged = "test";
            this._filter();
            this._updateUrl();
        });

        this.groupSelect.addEventListener("change", () => {
            this.lastChanged = "group";
            this._filter();
            this._updateUrl();
        });

        this._filter();
    }

    // === READ URL ===
    _loadFromUrl() {
        const params = new URLSearchParams(window.location.search);

        const test = params.get("test");
        const group = params.get("group");

        if (test) {
            this.testSelect.value = test;
            this.lastChanged = "test";
        }

        if (group) {
            this.groupSelect.value = group;
            this.lastChanged = "group";
        }
    }

    // === WRITE URL ===
    _updateUrl() {
        const params = new URLSearchParams();

        if (this.testSelect.value) {
            params.set("test", this.testSelect.value);
        }

        if (this.groupSelect.value) {
            params.set("group", this.groupSelect.value);
        }

        const newUrl = window.location.pathname + "?" + params.toString();
        window.history.replaceState({}, "", newUrl);
    }

    // === FILTER ===
    _filter() {
        const testVal = this.testSelect.value;
        const groupVal = this.groupSelect.value;

        // Reset logic
        if (this.lastChanged === "test") {
            this.groupSelect.value = "";
        }

        if (this.lastChanged === "group") {
            this.testSelect.value = "";
        }

        const finalTest = this.testSelect.value;
        const finalGroup = this.groupSelect.value;

        const cards = [...document.querySelectorAll(this.selector)];

        const filtered = cards.filter(card => {
            const table = card.dataset.table;
            const id = card.dataset.rowid;

            if (finalTest && !(table === "tests" && id == finalTest)) return false;
            if (finalGroup && !(table === "groups" && id == finalGroup)) return false;

            return true;
        });

        this.onFilter(filtered);
    }
}
