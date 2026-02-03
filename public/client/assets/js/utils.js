(function scrollAnimation() {
    function callback(entries) {
        entries.forEach(entry => {
            const el = entry.target;
            if (!el.dataset.saInit) {
                el.style.willChange = 'transform, opacity';
                el.style.transition = 'transform 0.28s ease-out, opacity 0.28s ease-out';
                el.dataset.saInit = '1';
            }
            if (entry.isIntersecting) {
                const t = Math.max(0, 1 - entry.intersectionRatio);
                el.style.transform = `translateY(${t * 80}px)`;
                el.style.opacity = String(entry.intersectionRatio);
            } else {
                el.style.transform = 'translateY(80px)';
                el.style.opacity = '0';
            }
        });
    }

    const options = { threshold: [0, 0.25, 0.5, 0.75, 1] };
    const observer = new IntersectionObserver(callback, options);
    document.querySelectorAll('.scroll_animate').forEach(el => {
        el.style.transform = 'translateY(80px)';
        el.style.opacity = '0';
        observer.observe(el);
    });
})();

// Bootstrap input falidation
function validateBootstrap(form) {
    'use strict';
    let isValid = true;

    form.querySelectorAll('input, textarea').forEach(input => {
        input.value = input.value.trim();
        if (!input.checkValidity()) isValid = false;
    });

    // Bootstrap validation
    if (!form.checkValidity()) {
        isValid = false;
    }

    form.classList.add('was-validated');
    return isValid;
}

async function doAxios(url, method = 'GET', data = {}) {
    try {
        const response = await axios({
            url,
            method,
            data,
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        return {
            success: true,
            status: response.status,
            data: response.data,
            error: false,
            message: response.data ?.message || 'Հաջողությամբ ստացվեց։'
        };
    } catch (error) {
        if (error.response) {
            return {
                success: false,
                status: error.response.status,
                data: null,
                error: true,
                message: error.response.data?.message || 'Սերվերից սխալ է ստացվել'
            };
        }

        return {
            success: false,
            status: null,
            data: null,
            error: true,
            message: error.message || 'Ցանցի կամ անհայտ սխալ'
        };
    }
}

function handlerNotify(message, type, iconColor = "#00ba00ff") {
    showNotification(message, type, 5000);
}

function setFormLoading(form, isLoading = true) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = isLoading;
}

document.addEventListener('DOMContentLoaded', function () {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl)
    });
});

// setup Navigation Links
function setupNavLinks() {
    // This will find all navigation links
    const links = document.querySelectorAll('a[data-section]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            if (window.location.pathname === '/' || window.location.pathname === '/') {
                const section = document.querySelector(`#${sectionId}`);
                if (section) section.scrollIntoView({
                    behavior: 'smooth'
                });
            } else {
                // Otherwise redirect to the home page with anchor
                window.location.href = `/${sectionId ? '#' + sectionId : ''}`;
            }
        });
    });
}

// Password show, hide
function exposePass() {
    var x = document.getElementById("xPassword");
    if (x.type === "password") {
        x.type = "text";
    } else {
        x.type = "password";
    }
}

function capLock(e) {
    kc = e.keyCode ? e.keyCode : e.which;
    sk = e.shiftKey ? e.shiftKey : ((kc == 16) ? true : false);
    if (((kc >= 65 && kc <= 90) && !sk) || ((kc >= 97 && kc <= 122) && sk))
        document.getElementById('capsOn').style.visibility = 'visible';
    else
        document.getElementById('capsOn').style.visibility = 'hidden';
}

function initPasswordToggle() {
    let passwordFields = document.querySelectorAll('.input_field');

    passwordFields.forEach(field => {
        let passwordInput = field.querySelector('input[type="password"]');

        if (passwordInput) {
            let button = document.createElement('button');
            button.type = "button";
            button.classList.add('password-show');
            button.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';

            button.addEventListener('click', function () {
                if (passwordInput.type === "password") {
                    passwordInput.type = "text";
                    button.innerHTML = `<i class="fa-solid fa-eye"></i>`;
                } else {
                    passwordInput.type = "password";
                    button.innerHTML = `<i class="fa-solid fa-eye-slash"></i>`;
                }
            });
            field.appendChild(button);
        }
    });
}

function changeProfileImage() {
    const inputs = document.querySelectorAll('input[name="user_img"]');
    inputs.forEach(input => {
        input.addEventListener('change', async function(e) {
            const file = this.files && this.files[0];
            if (!file) return;

            const hasCropper = !!document.querySelector('[data-crop-wrapper]');
            const fromCrop = this.dataset.cropped === '1';
            if (hasCropper && !fromCrop) {
                return;
            }

            const preview = document.querySelector('.profile-img');
            const pSmImage = document.querySelector('.profime-sm-image');
            if (preview) preview.src = URL.createObjectURL(file);
            if (pSmImage) pSmImage.src = URL.createObjectURL(file);

            const formData = new FormData();
            formData.append('user_img', file);

            try {
                const response = await doAxios('/api/v1/user/updateme', 'patch', formData);
                if (response.status === 400) {
                    if (preview) preview.src = './client/images/no-image-profile.jpg';
                    if (pSmImage) pSmImage.src = './client/images/no-image-profile.jpg';
                }
                this.dataset.cropped = '';
            } catch (err) {
                // console.error('Upload failed:', err);
            }
        });
    });
}

function setupReviewForm() {
    const form = document.getElementById('reviewForm');
    if (!form) return;
    const btn = document.getElementById('reviewSubmitBtn');
    if (!btn) return;
    form.addEventListener('submit', (e) => e.preventDefault());
    btn.addEventListener('click', async () => {
        const fd = new FormData(form);
        if (form.dataset.hasReview === '1') {
            showNotification('Դուք արդեն մեկնաբանություն թողել եք', 'warning', 3000);
            return;
        }
        const rating = fd.get('rating');
        if (!rating) {
            showNotification('Ընտրեք գնահատականը (աստղերը)', 'warning', 3000);
            return;
        }
        const comment = String(fd.get('comment') || '').trim();
        if (!comment) {
            showNotification('Գրեք մեկնաբանության տեքստը', 'warning', 3000);
            const ta = form.querySelector('[name="comment"]');
            if (ta) ta.focus();
            return;
        }
        const proceed = await showModalConfirm({
            title: 'Հաստատում',
            message: 'Ձեր մեկնաբանությունը ենթակա չէ փոփոխման։ Շարունակե՞լ',
            confirmText: 'Այո, ուղարկել',
            cancelText: 'Չեղարկել'
        });
        if (!proceed) return;
        setFormLoading(form, true);
        try {
            const res = await doAxios('/api/v1/review', 'post', fd);
            if (res && res.success) {
                showNotification('Շնորհակալություն ձեր կարծիքի համար!', 'success', 3000);
                form.reset();
                form.dataset.hasReview = '1';
                setTimeout(() => window.location.reload(), 500);
            } else {
                showNotification(res?.message || 'Սխալ փորձի ժամանակ', 'error', 3000);
            }
        } catch (err) {
            showNotification('Չհաջողվեց ուղարկել', 'error', 3000);
        } finally {
            setFormLoading(form, false);
        }
    });
}

const accordionCollapseElementList = document.querySelectorAll('#headingThree .collapse')
const accordionCollapseList = [...accordionCollapseElementList].map(accordionCollapseEl => new bootstrap.Collapse(accordionCollapseEl))

function setupAuthModals() {
    const loginModalEl = document.getElementById('signIn_signUp');
    const forgotLink = document.getElementById('forgotPasswordLink');

    if (!loginModalEl) return;

    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Find email input in the login form
            const form = loginModalEl.querySelector('form');
            const emailInput = form ? form.querySelector('input[name="email"]') : null;
            
            if (!emailInput) {
                showNotification('Էլ․ փոստի դաշտը չի գտնվել', 'warning', 3000);
                return;
            }

            const email = emailInput.value.trim();

            // Simple email validation regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!email) {
                showNotification('Խնդրում ենք լրացնել էլ․ փոստը մուտքի դաշտում', 'warning', 3000);
                emailInput.focus();
                return;
            }

            if (!emailRegex.test(email)) {
                showNotification('Խնդրում ենք մուտքագրել վավեր էլ․ փոստ', 'warning', 3000);
                emailInput.focus();
                return;
            }

            // Send request
            try {
                // Disable link temporarily
                forgotLink.style.pointerEvents = 'none';
                forgotLink.style.opacity = '0.5';

                const formData = new FormData();
                formData.append('email', email);

                const response = await doAxios('/api/v1/user/forgotPassword', 'POST', formData);
                
                if (response.success) {
                    showNotification(response.message || 'Հղումը ուղարկված է էլ․ փոստին', 'success', 4000);
                } else {
                    showNotification(response.message || 'Սխալ տեղի ունեցավ', 'error', 4000);
                }
            } catch (err) {
                console.error(err);
                showNotification('Ցանցի սխալ', 'error', 3000);
            } finally {
                forgotLink.style.pointerEvents = '';
                forgotLink.style.opacity = '';
            }
        });
    }
    
    // Ensure backdrop is removed when modal is closed
    loginModalEl.addEventListener('hidden.bs.modal', function () {
            // If no other modal is open, remove backdrop
            // We use a small timeout to allow the other modal to show up if we are switching
            setTimeout(() => {
                if (!document.querySelector('.modal.show')) {
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach(backdrop => backdrop.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.paddingRight = '';
                    document.body.style.overflow = '';
                }
            }, 100);
    });
}

setupAuthModals();
changeProfileImage();
setupReviewForm();
initPasswordToggle();
setupNavLinks();