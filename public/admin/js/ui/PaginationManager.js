export default class PaginationManager {
    constructor({ container, itemsPerPage = 30, urlParam = "page" }) {
        this.container = container;
        this.itemsPerPage = itemsPerPage;
        this.urlParam = urlParam;

        const params = new URLSearchParams(location.search);
        this.currentPage = parseInt(params.get(this.urlParam)) || 1;

        this.totalItems = 0;
        this.onPageChange = () => {};
    }
    setTotal(total) {
        this.totalItems = total;
    }

    setPage(page) {
        if (page === this.currentPage) return;
        this.currentPage = page;
        this._writeURL(page);
        this.onPageChange(page);
    }

    get totalPages() {
        return Math.ceil(this.totalItems / this.itemsPerPage);
    }

    _writeURL(page) {
        const url = new URL(window.location);
        if (page > 1) {
            url.searchParams.set(this.urlParam, page);
        } else {
            url.searchParams.delete(this.urlParam);
        }

        history.replaceState({}, "", url);
    }

    render() {
        if(!this.container) return;

        const totalPages = this.totalPages;

        if (totalPages === 0) {
            this.currentPage = 1;
            this.container.innerHTML = "";
            return;
        }
        if (this.currentPage > totalPages) {
            this.currentPage = totalPages;
        }

        if (this.currentPage < 1) {
            this.currentPage = 1;
        }

        this.container.innerHTML = "";

        if (totalPages <= 1) return;

        const nav = document.createElement("nav");
        const ul = document.createElement("ul");
        ul.className = "pagination justify-content-center";

        const addBtn = (label, page, disabled, isActive = false) => {
            const li = document.createElement("li");
            li.className = `page-item ${disabled ? "disabled" : ""} ${isActive ? "active" : ""}`;

            const btn = document.createElement("button");
            btn.className = "page-link";
            btn.innerHTML = label;

            if (!disabled && !isActive) {
                btn.onclick = (e) => {  
                    e.preventDefault();
                    this.setPage(page);
                    this.render();
                };
            }

            li.appendChild(btn);
            ul.appendChild(li);
        };

        const addEllipsis = () => {
            const li = document.createElement("li");
            li.className = "page-item disabled";
            li.innerHTML = '<span class="page-link">...</span>';
            ul.appendChild(li);
        };

        // Previous button
        addBtn(`<i class="bi bi-chevron-left"></i>`, this.currentPage - 1, this.currentPage === 1);

        // Page numbers
        const maxVisible = 5;
        
        if (totalPages <= 7) {
            // Show all if few pages
            for (let i = 1; i <= totalPages; i++) {
                addBtn(i, i, false, i === this.currentPage);
            }
        } else {
            // Always show first page
            addBtn(1, 1, false, 1 === this.currentPage);

            if (this.currentPage > 3) {
                addEllipsis();
            }

            // Calculate range
            let start = Math.max(2, this.currentPage - 1);
            let end = Math.min(totalPages - 1, this.currentPage + 1);

            // Adjust if near start
            if (this.currentPage <= 3) {
                end = 4;
            }

            // Adjust if near end
            if (this.currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            for (let i = start; i <= end; i++) {
                addBtn(i, i, false, i === this.currentPage);
            }

            if (this.currentPage < totalPages - 2) {
                addEllipsis();
            }

            // Always show last page
            addBtn(totalPages, totalPages, false, totalPages === this.currentPage);
        }

        // Next button
        addBtn(`<i class="bi bi-chevron-right"></i>`, this.currentPage + 1, this.currentPage === totalPages);

        nav.appendChild(ul);
        this.container.appendChild(nav);
    }

}
