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

        this.modal.show();

        return new Promise(resolve => {
            this.resolver = resolve;
        });
    }
}
