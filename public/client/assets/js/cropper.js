document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-crop-wrapper]").forEach(wrapper => {

        const prefix = wrapper.dataset.cropWrapper; 
        const selectBtn = wrapper.querySelector("[data-crop-select]");
        const fileInput = wrapper.querySelector("input[type='file']");

        const modalId = `${prefix}_modal`;
        const imgId = `${prefix}_img`;
        const saveBtnAttr = `[data-crop-save="${prefix}"]`;

        const modalEl = document.getElementById(modalId);
        const cropModal = new bootstrap.Modal(modalEl, { keyboard: true, backdrop: 'static' });

        const imageEl = document.getElementById(imgId);
        const saveBtn = modalEl.querySelector(saveBtnAttr);
        const reselectBtn = modalEl.querySelector(`[data-crop-reselect="${prefix}"]`);
        const deleteBtn = modalEl.querySelector(`[data-crop-delete="${prefix}"]`);

        let cropper = null;
        let currentObjectUrl = null;
        let saving = false;
        const opts = {
            aspectRatio: NaN,
            viewMode: 2,
            dragMode: 'move',
            background: false,
            responsive: true,
            checkOrientation: false,
            toggleDragModeOnDblclick: false,
            zoomOnWheel: false,
            zoomOnTouch: false,
            guides: false,
            center: false,
            highlight: false,
            minContainerWidth: 320,
            minContainerHeight: 200,
            autoCropArea: 0.9
        };
        function initCropper() {
            if (cropper) { cropper.destroy(); cropper = null; }
            cropper = new Cropper(imageEl, opts);
        }

        selectBtn.addEventListener("click", () => fileInput.click());

        // External trigger (e.g., profile image click)
        const triggers = document.querySelectorAll(`[data-crop-trigger="${prefix}"]`);
        triggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const currentSrc = trigger.getAttribute('src') || '';
                const isDefault = /no-image-profile\.jpg$/i.test(currentSrc);
                
                let srcToUse = currentSrc;
                if (!srcToUse && trigger.tagName !== 'IMG') {
                    const profileImg = document.querySelector('.profile-img-lg');
                    if (profileImg) {
                        srcToUse = profileImg.src;
                    }
                }

                if (srcToUse && !isDefault) {
                    if (cropper) { cropper.destroy(); cropper = null; }
                    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
                    imageEl.src = srcToUse;
                    imageEl.style.maxHeight = '70vh';
                    imageEl.style.maxWidth = '100%';
                    imageEl.style.objectFit = 'contain';
                    cropModal.show();
                } else {
                    selectBtn.click();
                }
            });
        });

        // 2) crop modal
        fileInput.addEventListener("change", e => {
            const file = e.target.files[0];
            if (!file) return;

            if (fileInput.dataset.cropped === '1') {
                delete fileInput.dataset.cropped;
                return;
            }

            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = URL.createObjectURL(file);
            imageEl.src = currentObjectUrl;
            imageEl.style.maxHeight = '70vh';
            imageEl.style.maxWidth = '100%';
            imageEl.style.objectFit = 'contain';
            if (modalEl.classList.contains('show')) { initCropper(); } else { cropModal.show(); }
        });

        if (reselectBtn) {
            reselectBtn.addEventListener('click', () => fileInput.click());
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const confirmed = await showConfirm({
                    title: 'Վստա՞հ եք',
                    message: 'Ջնջել պրոֆիլի նկարը',
                    confirmText: 'Այո, ջնջել',
                    cancelText: 'Չեղարկել',
                    timeout: 3000
                });
                if (!confirmed) return;
                try {
                    const res = await doAxios('/api/v1/user/avatar', 'delete');
                    
                    // Helper to generate color index from name
                    const getBgClass = (name) => {
                        let hash = 0;
                        for (let i = 0; i < name.length; i++) {
                            hash = name.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        const index = Math.abs(hash) % 10;
                        return `bg-${index}`;
                    };

                    const updateToPlaceholder = (imgElement, isSmall = false) => {
                        if (!imgElement) return;
                        
                        let name = '';
                        
                        // 1. For Profile Page (Large Image), prioritize the visible name in header
                        if (!isSmall) {
                            const nameEl = document.querySelector('.profile-info h3');
                            if (nameEl) name = nameEl.innerText.trim();
                        }

                        // 2. For Navbar (Small Image), use tooltip
                        if (!name && isSmall) {
                             const parentLink = imgElement.closest('a');
                             if (parentLink && parentLink.dataset.bsTitle) {
                                 name = parentLink.dataset.bsTitle;
                             }
                        }

                        // 3. Fallback to Alt text (ignoring generic "Profile")
                        if (!name && imgElement.alt && imgElement.alt !== 'Profile') {
                            name = imgElement.alt;
                        }

                        // 4. Final Fallback
                        if (!name) name = 'User';

                        const initial = name.charAt(0).toUpperCase();
                        const bgClass = getBgClass(name);

                        const div = document.createElement('div');
                        
                        if (isSmall) {
                            // Navbar style
                            div.className = `profime-sm-image border border-primary border-2 d-flex align-items-center justify-content-center text-white ${bgClass}`;
                            div.innerHTML = `<span style="font-size: 1.2rem; line-height: 1;">${initial}</span>`;
                        } else {
                            // Profile page style
                            div.className = 'profile-img-lg d-flex align-items-center justify-content-center text-uppercase fw-bold placeholder-wrapper';
                            div.innerHTML = `<div class="profile-placeholder-img rounded-circle ${bgClass}">${initial}</div>`;
                        }

                        imgElement.replaceWith(div);
                    };

                    const profileImgLg = document.querySelector('.profile-img-lg'); // Profile page main image
                    const smallImg = document.querySelector('.profime-sm-image');   // Navbar image

                    // Check if they are images before replacing (they might already be placeholders)
                    if (profileImgLg && profileImgLg.tagName === 'IMG') {
                        updateToPlaceholder(profileImgLg, false);
                    }
                    if (smallImg && smallImg.tagName === 'IMG') {
                        updateToPlaceholder(smallImg, true);
                    }

                    showNotification('Նկարը ջնջվեց', 'success', 3000);
                    setTimeout(() => window.location.reload(), 1000);
                } catch (e) {
                    showNotification('Չհաջողվեց ջնջել նկարը', 'error', 3000);
                    return;
                }
                cropModal.hide();
                if (cropper) { cropper.destroy(); cropper = null; }
                imageEl.src = '';
                if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
            });
        }

        modalEl.addEventListener("shown.bs.modal", () => {
            requestAnimationFrame(() => { initCropper(); });
        });

        // 4) Cleanup
        modalEl.addEventListener("hidden.bs.modal", () => {
            if (saving) return; 
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            imageEl.src = "";
            if (currentObjectUrl) {
                URL.revokeObjectURL(currentObjectUrl);
                currentObjectUrl = null;
            }
        });

        // 5)  crop–ը
        saveBtn.addEventListener("click", () => {
            if (!cropper) return;
            saving = true;

            // Loading state
            const originalHtml = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Պահպանվում է...';
            saveBtn.disabled = true;

            const canvas = cropper.getCroppedCanvas({ maxWidth: 720, maxHeight: 720 });
            canvas.toBlob(async blob => {
                const formData = new FormData();
                const fieldName = fileInput.name || 'user_img';
                formData.append(fieldName, blob, 'user_img.jpg');

                try {
                    const res = await doAxios('/api/v1/user/updateme', 'PATCH', formData);

                    if (res.success) {
                        const previewUrl = URL.createObjectURL(blob);
                        
                        // Update UI immediately
                        const profileImg = document.querySelector('.profile-img');
                        const profileImgLg = document.querySelector('.profile-img-lg');
                        const smallImg = document.querySelector('.profime-sm-image');
                        
                        if (profileImg) profileImg.src = previewUrl;
                        if (profileImgLg) profileImgLg.src = previewUrl;
                        if (smallImg) smallImg.src = previewUrl;

                        showNotification('Նկարը հաջողությամբ պահպանվեց', 'success', 2000);
                        cropModal.hide();
                        setTimeout(() => window.location.reload(), 1000);
                    } else {
                        showNotification(res.message || 'Սխալ տեղի ունեցավ', 'error', 3000);
                    }
                } catch (e) {
                    // console.error(e);
                    showNotification('Սխալ տեղի ունեցավ', 'error', 3000);
                } finally {
                    saveBtn.innerHTML = originalHtml;
                    saveBtn.disabled = false;
                    saving = false;

                    if (cropper) { cropper.destroy(); cropper = null; }
                    imageEl.src = "";
                    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null; }
                }
            }, 'image/jpeg', 0.85);
        });

    });
});
