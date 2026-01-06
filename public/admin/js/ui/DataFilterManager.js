export default class DataFilterManager {
    constructor({ data, testSelectSelector, groupSelectSelector, onFilter }) {
        this.data = data || [];
        this.testSelect = document.querySelector(testSelectSelector);
        this.groupSelect = document.querySelector(groupSelectSelector);
        this.onFilter = onFilter || function() {};
        
        this.lastChanged = null;

        if (!this.testSelect || !this.groupSelect) return;

        // Load from URL
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

        // Initial filter
        this._filter();
    }

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

    _updateUrl() {
        const params = new URLSearchParams(window.location.search);
        
        if (this.testSelect.value) params.set("test", this.testSelect.value);
        else params.delete("test");

        if (this.groupSelect.value) params.set("group", this.groupSelect.value);
        else params.delete("group");

        const newUrl = window.location.pathname + "?" + params.toString();
        window.history.replaceState({}, "", newUrl);
    }

    _filter() {
        // Reset logic: mutually exclusive or both? 
        // Original logic was mutually exclusive (selecting test clears group).
        
        if (this.lastChanged === "test") {
            this.groupSelect.value = "";
        }
        if (this.lastChanged === "group") {
            this.testSelect.value = "";
        }

        const testVal = this.testSelect.value;
        const groupVal = this.groupSelect.value;

        let filtered = this.data;

        if (testVal) {
            filtered = filtered.filter(q => q.table_name === 'tests' && String(q.row_id) === String(testVal));
        } else if (groupVal) {
            filtered = filtered.filter(q => q.table_name === 'groups' && String(q.row_id) === String(groupVal));
        }

        this.onFilter(filtered);
    }
}
