class Confirm {
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

document.addEventListener('DOMContentLoaded', function () {
    function initializeUniversalFeatures() {
        initializeFileCropping();
        initializeNotificationsBell();
    }
    initializeUniversalFeatures();
    let cropper = null;
    let currentImagePreview = null;
    let currentCropperPage = null;
    function initializeFileCropping() {
        // Find all file inputs with file-crop class
        const fileCropInputs = document.querySelectorAll('input[type="file"].file-crop');

        fileCropInputs.forEach(input => {
            const uploadBtn = input.closest('.image-upload').querySelector('button');
            const previewElement = input.closest('.image-upload').querySelector('img');

            if (uploadBtn && previewElement) {
                uploadBtn.addEventListener('click', () => input.click());
                input.addEventListener('change', (e) => handleImageUploadWithCrop(e, previewElement));
            }
        });

        initializeCropModal();
    }
    async function initializeNotificationsBell() {
        const bell = document.getElementById('adminNotificationsBell');
        const countEl = document.getElementById('adminNotificationsCount');
        const menu = document.getElementById('adminNotificationsMenu');
        if (!bell || !countEl || !menu) return;

        function getSeen(key) {
            try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
        }
        function setSeen(key, ids) {
            localStorage.setItem(key, JSON.stringify(ids));
        }

        async function loadData() {
            const [regRes, msgRes] = await Promise.all([
                doAxios('/api/v1/registration', 'GET'),
                doAxios('/api/v1/contact/message', 'GET'),
            ]);

            const regsAll = regRes.success && Array.isArray(regRes.data?.registrations) ? regRes.data.registrations : [];
            const msgsAll = msgRes.success && Array.isArray(msgRes.data?.items) ? msgRes.data.items : [];

            const seenRegs = getSeen('seen.registrations');
            const seenMsgs = getSeen('seen.contactMessages');

            const regsNew = regsAll
                .sort((a,b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                .filter(r => !seenRegs.includes(r.id))
                .map(r => ({ type:'reg', id: r.id, title: `${r.name} ${r.lastname}`.trim(), when: new Date(r.createdAt || r.date) }));
            const msgsNew = msgsAll
                .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
                .filter(m => !seenMsgs.includes(m.id))
                .map(m => ({ type:'msg', id: m.id, title: `${m.name} ${m.lastname}`.trim(), when: new Date(m.createdAt), subject: m.subject }));

            return { regsNew, msgsNew, seenRegs, seenMsgs };
        }

        function renderMenu(items) {
            menu.innerHTML = '';
            const header = document.createElement('li');
            header.className = 'dropdown-header border-bottom py-2 mb-1';
            header.textContent = 'Ծանուցումներ';
            menu.appendChild(header);

            if (!items.length) {
                const empty = document.createElement('li');
                empty.innerHTML = '<div class="px-3 py-3 small text-muted text-center">Ծանուցումներ չկան</div>';
                menu.appendChild(empty);
                return;
            }

            items.forEach(it => {
                const li = document.createElement('li');
                const isReg = it.type === 'reg';
                const iconClass = isReg ? 'bi-person-plus-fill' : 'bi-envelope-fill';
                const bgClass = isReg ? 'bg-primary-subtle text-primary' : 'bg-info-subtle text-info';
                
                const dateStr = it.when ? new Date(it.when).toLocaleString('hy-AM', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const extra = it.subject ? ` — ${it.subject}` : '';
                
                const typeLabel = isReg ? 'Նոր գրանցում' : 'Նոր նամակ';

                li.innerHTML = `
                <a href="#" class="dropdown-item d-flex align-items-start py-2 border-bottom" data-type="${it.type}" data-id="${it.id}">
                    <div class="rounded-circle p-2 me-3 d-flex align-items-center justify-content-center flex-shrink-0 ${bgClass}" style="width: 40px; height: 40px;">
                        <i class="bi ${iconClass} fs-5"></i>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                             <span class="badge ${isReg ? 'text-bg-primary' : 'text-bg-info'} rounded-pill" style="font-size: 0.7rem;">${typeLabel}</span>
                             <small class="text-muted ms-2" style="font-size: 0.7rem;">${dateStr}</small>
                        </div>
                        <div class="fw-semibold text-truncate text-dark" style="font-size: 0.9rem;">${it.title}</div>
                        ${extra ? `<div class="small text-muted text-truncate">${extra}</div>` : ''}
                    </div>
                </a>`;
                menu.appendChild(li);
            });
        }

        async function refresh() {
            const { regsNew, msgsNew } = await loadData();
            const total = regsNew.length + msgsNew.length;
            countEl.textContent = total > 0 ? String(total) : '';
            countEl.style.display = total > 0 ? 'inline-block' : 'none';
            renderMenu([...regsNew, ...msgsNew]);
        }

        await refresh();

        menu.addEventListener('click', async (e) => {
            const a = e.target.closest('a[data-type][data-id]');
            if (!a) return;
            e.preventDefault();
            const type = a.getAttribute('data-type');
            const id = parseInt(a.getAttribute('data-id'), 10);

            if (type === 'reg') {
                const seen = getSeen('seen.registrations');
                if (!seen.includes(id)) { seen.push(id); setSeen('seen.registrations', seen); }
                await refresh();
                location.href = '/admin/registrations';
            } else if (type === 'msg') {
                const seen = getSeen('seen.contactMessages');
                if (!seen.includes(id)) { seen.push(id); setSeen('seen.contactMessages', seen); }
                await refresh();
                location.href = '/admin/contact-messages';
            }
        });
    }
    function handleImageUploadWithCrop(event, previewElement) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                currentImagePreview = previewElement;
                // Determine page context for aspect ratio
                const pathname = window.location.pathname;
                const isSections = pathname.includes('sections.html') || pathname.includes('sections');
                const isCatalogs = pathname.includes('catalogs.html') || pathname.includes('catalogs');
                const isProducts = pathname.includes('products.html') || pathname.includes('products');
                currentCropperPage = isSections ? 'sections' : isCatalogs ? 'catalogs' : isProducts ? 'products' : null;
                openCropModal(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    }
    function openCropModal(imageSrc) {
        const cropModal = new bootstrap.Modal(document.getElementById('cropModal'));
        const cropImage = document.getElementById('cropImage');

        if (!cropModal || !cropImage) return;

        cropImage.src = imageSrc;
        cropModal.show();

        setTimeout(() => {
            let aspectRatio;
            if (currentCropperPage === 'catalogs' || currentCropperPage === 'products') {
                aspectRatio = 1;
            } else {
                aspectRatio = NaN; 
            }

            cropper = new Cropper(cropImage, {
                aspectRatio: aspectRatio,
                viewMode: 1,
                responsive: true,
                restore: false,
                checkCrossOrigin: false,
                checkOrientation: false,
                modal: true,
                guides: true,
                center: true,
                highlight: true,
                background: false,
                autoCrop: true,
                autoCropArea: 0.8
            });
        }, 500);
    }
    function initializeCropModal() {
        const cropSaveBtn = document.getElementById('cropSaveBtn');
        if (cropSaveBtn) {
            cropSaveBtn.addEventListener('click', function () {
                if (cropper) {
                    const originalImage = document.getElementById('cropImage');
                    const canvas = cropper.getCroppedCanvas({
                        width: originalImage.naturalWidth,
                        height: originalImage.naturalHeight,
                        imageSmoothingEnabled: true,
                        imageSmoothingQuality: 'high'
                    });

                    canvas.toBlob(function (blob) {
                        const croppedImageUrl = URL.createObjectURL(blob);
                        if (currentImagePreview) {
                            currentImagePreview.src = croppedImageUrl;
                        }

                        // Close modal
                        const cropModal = bootstrap.Modal.getInstance(document.getElementById('cropModal'));
                        cropModal.hide();

                        // Destroy cropper
                        cropper.destroy();
                        cropper = null;
                    }, 'image/jpeg', 0.9);
                } else {
                    console.error('No cropper instance found'); // Debug log
                }
            });
        }

        // Reset cropper when modal is hidden
        const cropModalElement = document.getElementById('cropModal');
        if (cropModalElement) {
            cropModalElement.addEventListener('hidden.bs.modal', function () {
                if (cropper) {
                    cropper.destroy();
                    cropper = null;
                }
            });
        }
    }
    async function doAxios(url, method = 'GET', data = {}) {
        const isForm = data instanceof FormData;
        try {
            const response = await axios({
                url,
                method,
                data,
                headers: isForm ? {} : {
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: true,
                status: response.status,
                data: response.data,
                error: false,
                message: response.data?.message || 'OK'
            };

        } catch (error) {
            return {
                success: false,
                status: error.response?.status || null,
                data: null,
                error: true,
                message: error.response?.data?.message || 'Error'
            };
        }
    }
    function setFormLoading(form, isLoading = true) {
        const btn = form.querySelector('button[type="submit"]');
        if (!btn) return;
        btn.disabled = isLoading;
    }
    function validateForm(form) {
        const inputs = form.querySelectorAll('.validate');

        let hasEmptyField = false;
        let notified = false;

        inputs.forEach(input => {
            if (input.type === 'file' && input.value === '') return;
            const value = (input.value || '').trim();
            if (value === '') {
                if (!notified) {
                    showNotification(`<b class="text-danger">«${input.getAttribute('placeholder') || "բոլոր "}»</b> մուտքագրման դաշտը պետք է լրացվի.`, 'warning');
                    notified = true;
                }
                input.style.outline = '1px solid #fc0303';
                hasEmptyField = true;
            } else {
                input.style.outline = '';
            }
        });

        return !hasEmptyField;
    }
    function buildWorkingHours() {

        const contactsForm = document.getElementById("contactsForm");
        if(!contactsForm) return;

        const wdFrom = document.getElementById("wd-from").value;
        const wdTo   = document.getElementById("wd-to").value;

        const satOpen = document.getElementById("sat-open").checked;
        const satFrom = document.getElementById("sat-from").value;
        const satTo   = document.getElementById("sat-to").value;

        const sunOpen = document.getElementById("sun-open").checked;
        const sunFrom = document.getElementById("sun-from").value;
        const sunTo   = document.getElementById("sun-to").value;

        const result = [];

        // Monday–Friday (always open)
        result.push({
            days: ["mon","tue","wed","thu","fri"],
            hours: `${wdFrom}-${wdTo}`
        });

        // Saturday
        if (satOpen) {
            result.push({
                days: ["sat"],
                hours: `${satFrom}-${satTo}`
            });
        } else {
            result.push({
                days: ["sat"],
                hours: "closed"
            });
        }

        // Sunday
        if (sunOpen) {
            result.push({
                days: ["sun"],
                hours: `${sunFrom}-${sunTo}`
            });
        } else {
            result.push({
                days: ["sun"],
                hours: "closed"
            });
        }

        return JSON.stringify(result);
    }
    async function handlerSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const button = form.querySelector('button[type="submit"]');
        const inputs = form.querySelectorAll('input, textarea');

        if (!validateForm(form)) return;

        button.disabled = true;
        setFormLoading(form, true);

        const formData = new FormData(form);
        
        // Extract options[] explicitly
        const optionInputs = form.querySelectorAll('[name="answer_item"]');
        let optionsToJson = Array.from(optionInputs).map(i => i.value.trim()).filter(Boolean);

        formData.set('options', JSON.stringify(optionsToJson));
        const wh = buildWorkingHours();
        if (wh) formData.set('workingHours', wh);
        const URL = form.getAttribute('action');
        const METHOD = form.getAttribute('method')?.toLowerCase();

        if (URL.includes('logout')) {
            window.location.href = '/';
            return;
        }
        const confirm = new Confirm();
        if (METHOD === 'delete') {
            const yes = await confirm.open({
                title: "Վստահ ե՞ք, որ ցանկանում եք ջնջել",
                message: "Այս գործողությունը հետ չես բերի։<br><b>Շարունակե՞լ</b>",
                okText: "Ջնջել",
                cancelText: "Չեղարկել",
                okClass: "btn-danger"
            });
            if (!yes) return;
        }

        button.disabled = true;
        setFormLoading(form, true);

        try {
            const config = await doAxios(URL, METHOD, formData);
            if (!config || config.status >= 400 || config.error) {
                showNotification(config?.message || 'Խնդիր առաջացավ, խնդրում ենք կրկին փորձել։', 'error');
            } else {
                // Reset logic
                if (METHOD === 'post') {
                    form.querySelectorAll('.validate').forEach(i => (i.value = ''));
                    form.querySelectorAll('.editor-area').forEach(e => (e.innerHTML = ''));
                }

                if (METHOD !== 'post' && METHOD !== 'patch') {
                    inputs.forEach(el => (el.value = ''));
                }
                showNotification("Հաջողությամբ ստացվել է", 'success');
                setTimeout(() => location.reload(), 2000);
            }
        } catch (error) {
            showNotification(error?.message || 'Server error', 'error');
        } finally {
            setFormLoading(form, false);
            button.disabled = false;
        }   
    }
    Array.from(document.querySelectorAll('form')).forEach(form => {
        form.addEventListener('submit', handlerSubmit);
    });
    function trima() {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(el => {
            el.value = el.value.trim();
        });
    }
    trima();
});
