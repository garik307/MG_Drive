document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-crop-wrapper]").forEach(wrapper => {

        const prefix = wrapper.dataset.cropWrapper; 
        const selectBtn = wrapper.querySelector("[data-crop-select]");
        const previewBox = wrapper.querySelector("[data-crop-preview]");
        const fileInput = wrapper.querySelector("input[type='file']");

        const modalId = `${prefix}_modal`;
        const imgId = `${prefix}_img`;
        const saveBtnAttr = `[data-crop-save="${prefix}"]`;

        const modalEl = document.getElementById(modalId);
        const cropModal = new bootstrap.Modal(modalEl);

        const imageEl = document.getElementById(imgId);
        const saveBtn = modalEl.querySelector(saveBtnAttr);

        let cropper = null;

        selectBtn.addEventListener("click", () => fileInput.click());

        fileInput.addEventListener("change", e => {
            const file = e.target.files[0];
            if (!file) return;

            if (cropper) {
                cropper.destroy();
                cropper = null;
            }

            imageEl.src = URL.createObjectURL(file);
            cropModal.show();
        });

        // 3) Init Cropper 
        modalEl.addEventListener("shown.bs.modal", () => {
            cropper = new Cropper(imageEl, {
                aspectRatio: NaN,
                viewMode: 1
            });
        });

        // 4) Cleanup
        modalEl.addEventListener("hidden.bs.modal", () => {
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            imageEl.src = "";
        });

        // 5) save crop img
        saveBtn.addEventListener("click", () => {
            if (!cropper) return;

            cropper.getCroppedCanvas().toBlob(blob => {
                const file = new File([blob], "cropped.png", { type: blob.type });

                // input[type=file] → blob
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;

                previewBox.innerHTML =
                    `<img src="${URL.createObjectURL(blob)}" class="img-fluid rounded">`;
                cropModal.hide();
            });
        });
    });
});
