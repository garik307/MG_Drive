if (!window.__clientAppInitialized) {
    window.__clientAppInitialized = true;
    const backToTop = document.getElementById('backToTop');
    const progress = document.getElementById('progress');
    const navProgress = document.querySelector('.nav_progress');

    function handleNavbar() {
        let nav = document.querySelector('nav');
        let body = document.querySelector('body');

        let navLinks = document.querySelectorAll('.nav_link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => body.classList.remove('nav-open'));
        });

        document.querySelector('body').addEventListener('click', (e) => {
            if (e.target.classList.contains('mobile-overlay')) {
                body.classList.remove('nav-open');
            }
        });

        window.addEventListener('scroll', () => {
            // Check the vertical scroll position
            if (window.scrollY > 700) {
                nav.classList.add('sticky');
            } else {
                nav.classList.remove('sticky');
            }
        });
    }

    function inputField() {
        let inputField = document.querySelectorAll('.input_field');

        inputField.forEach(element => {
            const input = element.querySelector('input');
            const span = element.querySelector('span');
            handleInputChange(input, span)

            // Add an event listener for user input
            input.addEventListener('input', () => handleInputChange(input, span));
        });

        function handleInputChange(input, span) {
            const hasValue = input.value.trim() !== '';
            if (input !== null && span !== null) hasValue ? span.classList.add('active') : span.classList.remove('active')
        }
    }


    if (progress) {
        window.addEventListener('scroll', () => {
            // Back to Top visibility
            if (window.scrollY > 700) backToTop.classList.add('active');
            else backToTop.classList.remove('active');

            // Scroll progress
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = (scrollTop / docHeight) * 100;

            if (Math.round(scrollPercent) > 60) {
                backToTop.style.color = '#fff';
            } else {
                backToTop.style.color = 'var(--primary-color)';
            }


            progress.style.width = scrollPercent + "%";
            if (navProgress) navProgress.style.width = scrollPercent + "%";
        });
    }

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth',
            });
        });
    }

    // account profile check gender fields
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('gender')) {

            const input = e.target.closest('input');
            document.querySelectorAll('label').forEach(el => el.style.border = '1px solid #ddd')

            e.target.closest('label').style.border = '1px solid #ccc';
            setTimeout(() => {
                if (input.checked) {
                    e.target.closest('label').style.border = '1px solid #444cf7';
                } else {
                    e.target.closest('label').style.border = '1px solid #ccc';
                }
            }, 10);
        }
    });

    Array.from(document.querySelectorAll('form')).forEach(form => {
        if (form.id === 'resetPasswordForm' || form.classList.contains('manual-submit')) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateBootstrap(form)) {
                showNotification("Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը", 'warning', 3000);
                return;
            }

            const button = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);
            const URL = form.getAttribute('action');
            const METHOD = form.getAttribute('method') ?.toLowerCase();

            // Save original button state
            const originalContent = button.innerHTML;
            
            // Disable and show loading state
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Խնդրում ենք սպասել...';
            
            setFormLoading(form, true);

            let reopenDelay = 2000;

            try {
                let dataToSend = formData;
                if (METHOD !== 'patch' && METHOD !== 'post') {
                    dataToSend = Object.fromEntries(formData.entries());
                }

                const response = await doAxios(URL, METHOD, dataToSend);
                if (response ?.error || response ?.status >= 400) {
                    showNotification(response.message || 'Խնդրում ենք կրկին փորձել', 'warning', 3000);
                    reopenDelay = 3000;
                } else {
                    showNotification('Հաջողությամբ ստացվեց', 'success', 2000);
                    const redirect = response ?.data ?.redirect || form.getAttribute('data-redirect');
                    const shouldReload = Boolean(response ?.data ?.reload) ||
                        form.getAttribute('data-reload') === '1';
                    
                    if (redirect) setTimeout(() => window.location.assign(redirect), 2000);
                    if (shouldReload) setTimeout(() => window.location.reload(), 2000);
                    
                    if (shouldReload && !window.__allowReload) {
                        window.__allowReload = true;
                        setTimeout(() => window.location.reload(), 2000);
                        return;
                    }
                }
            } catch (err) {
                showNotification(
                    err ?.response ?.data ?.message || 'Ցանցի սխալ',
                    'warning'
                );
                reopenDelay = 3000;
            }

            setTimeout(() => {
                setFormLoading(form, false);
                button.disabled = false;
                button.innerHTML = originalContent;
            }, reopenDelay);
        });
    });

    // Newsletter specific handler
    const newsletterForms = document.querySelectorAll('.newsletter-form');
    newsletterForms.forEach(newsletterForm => {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Basic validation
            if (!newsletterForm.checkValidity()) {
                newsletterForm.reportValidity();
                return;
            }

            const button = newsletterForm.querySelector('button[type="submit"]');
            const formData = new FormData(newsletterForm);
            const URL = newsletterForm.getAttribute('action');
            const METHOD = newsletterForm.getAttribute('method')?.toLowerCase() || 'post';

            const originalContent = button.innerHTML;
            button.disabled = true;
            // Minimal loading indicator for small button
            button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
            
            setFormLoading(newsletterForm, true);

            try {
                let dataToSend = formData;
                if (METHOD !== 'patch' && METHOD !== 'post') {
                    dataToSend = Object.fromEntries(formData.entries());
                }

                const response = await doAxios(URL, METHOD, dataToSend);
                if (response?.error || response?.status >= 400) {
                    showNotification(response.message || 'Խնդրում ենք կրկին փորձել', 'warning', 3000);
                } else {
                    showNotification('Դուք հաջողությամբ բաժանորդագրվեցիք', 'success', 3000);
                    newsletterForm.reset();
                }
            } catch (err) {
                showNotification(err?.response?.data?.message || 'Ցանցի սխալ', 'warning');
            }

            setTimeout(() => {
                setFormLoading(newsletterForm, false);
                button.disabled = false;
                button.innerHTML = originalContent;
            }, 1000);
        });
    });

    function resetPassword() {
        const form = document.getElementById('resetPasswordForm');
        const token = '<%= token %>';
        const togglePasswordBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');

        console.log('wedwe');
        
        // Toggle password visibility
        togglePasswordBtn.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });

        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (!form.checkValidity()) {
                e.stopPropagation();
                form.classList.add('was-validated');
                return;
            }

            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('passwordConfirm').value;

            if (password !== passwordConfirm) {
                showNotification('Գաղտնաբառերը չեն համընկնում', 'error');
                return;
            }

            try {
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Կատարվում է...';

                const response = await doAxios(`/api/v1/user/resetPassword/${token}`, 'POST', {
                    password
                });

                if (response.success) {
                    showNotification('Գաղտնաբառը հաջողությամբ փոխվեց', 'success');
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                } else {
                    showNotification(response.message || 'Սխալ տեղի ունեցավ', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            } catch (err) {
                console.error(err);
                showNotification('Սխալ տեղի ունեցավ', 'error');
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Պահպանել գաղտնաբառը';
            }
        });
    }

    handleNavbar();
    inputField();
}
