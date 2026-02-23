export default class Confirm {
    constructor() {
        this.modalEl = document.getElementById("confirmModal");
        this.modal = new bootstrap.Modal(this.modalEl);

        this.titleEl = document.getElementById("confirmModalTitle");
        this.bodyEl  = document.getElementById("confirmModalBody");
        this.okBtn   = document.getElementById("confirmOkBtn");
        this.cancelBtn = document.getElementById("confirmCancelBtn");

        this.resolver = null;

        // Bind events
        this.okBtn.addEventListener("click", () => this._resolve(true));
        this.cancelBtn.addEventListener("click", () => this._resolve(false));

        this.modalEl.addEventListener("hidden.bs.modal", () => {
            this.resolver = null;
        });
    }

    _resolve(value) {
        this.modal.hide();
        if (this.resolver) this.resolver(value);
    }

    open({
        title = "Հաստատում",
        message = "Համոզվա՞ծ եք։",
        okText = "Այո",
        cancelText = "Չեղարկել",
        okClass = "btn-danger"
    } = {}) {

        this.titleEl.textContent = title;
        this.bodyEl.innerHTML = message;

        this.okBtn.textContent = okText;
        this.cancelBtn.textContent = cancelText;

        this.okBtn.className = `btn ${okClass}`;

        // Dynamic z-index so it appears above the current modal
        const openModals = document.querySelectorAll('.modal.show').length;
        const base = 1050; // Bootstrap modal base z-index
        const zIndex = base + (openModals + 1) * 20;
        this.modalEl.style.zIndex = String(zIndex);

        this.modal.show();

        // Raise backdrop too
        // Pick the last backdrop created by Bootstrap
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const backdrop = backdrops[backdrops.length - 1];
        if (backdrop) {
            backdrop.style.zIndex = String(zIndex - 10);
        }

        return new Promise(resolve => {
            this.resolver = resolve;
        });
    }
}
