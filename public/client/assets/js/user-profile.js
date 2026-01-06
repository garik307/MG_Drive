document.addEventListener('DOMContentLoaded', function () {
    // Handle User Profile Update
    const profileForm = document.querySelector('.form-user-update');
    if (profileForm) {
        profileForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!validateBootstrap(this)) return;

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            setFormLoading(this, true);
            btn.innerHTML = 'Պահպանվում է...';

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            const result = await doAxios('/api/v1/user/updateme', 'PATCH', data);

            setFormLoading(this, false);
            btn.innerHTML = originalText;

            if (result.success) {
                handlerNotify('Տվյալները հաջողությամբ թարմացվեցին', 'success');
                setTimeout(() => window.location.reload(), 500);
            } else {
                handlerNotify(result.message || 'Սխալ տեղի ունեցավ', 'danger');
            }
        });
    }

    // Handle Password Update (Applies to both forms)
    const passwordForms = document.querySelectorAll('.form-password-update');
    passwordForms.forEach(form => {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            if (!validateBootstrap(this)) return;

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            setFormLoading(this, true);
            btn.innerHTML = 'Խնդրում ենք սպասել...';

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            const result = await doAxios('/api/v1/user/updateMyPassword', 'PATCH',
                data);

            setFormLoading(this, false);
            btn.innerHTML = originalText;

            if (result.success) {
                handlerNotify('Գաղտնաբառը հաջողությամբ թարմացվեց', 'success');
                this.reset();
                // Close modal if open
                const modalEl = document.getElementById('changePasswordModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            } else {
                handlerNotify(result.message || 'Սխալ տեղի ունեցավ', 'danger');
            }
        });
    });

    // Payment Tab Auto-Exit Logic (2 minutes)
    const paymentTabBtn = document.getElementById('payment-tab');
    const overviewTabBtn = document.getElementById('overview-tab');
    let paymentTimer = null;

    if (paymentTabBtn && overviewTabBtn) {
        // When payment tab is shown
        paymentTabBtn.addEventListener('shown.bs.tab', function () {
            if (paymentTimer) clearTimeout(paymentTimer);
            console.log('Payment timer started (2 mins)');
            // Set 2 minutes (120000ms) timer
            paymentTimer = setTimeout(() => {
                console.log('Timer expired, switching to overview');
                // Switch back to overview
                overviewTabBtn.click();
            }, 120000);
        });

        const allTabs = document.querySelectorAll('[data-bs-toggle="tab"]');
        allTabs.forEach(tab => {
            if (tab.id !== 'payment-tab') {
                tab.addEventListener('show.bs.tab', function () {
                    if (paymentTimer) {
                        console.log('Payment timer cleared');
                        clearTimeout(paymentTimer);
                        paymentTimer = null;
                    }
                });
            }
        });
    }

    // Handle Review Logic
    const reviewForm = document.getElementById('profileReviewForm');
    if (reviewForm) {
        // Star Rating Interaction (Using Wrappers for FA SVG compatibility)
        const starsContainer = reviewForm.querySelector('.rating-stars');
        const wrappers = reviewForm.querySelectorAll('.star-wrapper');
        const ratingInput = document.getElementById('ratingInput');
        const ratingText = document.getElementById('ratingText');

        if (starsContainer) {
            let currentRating = 0;

            const updateStars = (value) => {
                wrappers.forEach(w => {
                    const starValue = parseInt(w.dataset.value);
                    const solid = w.querySelector('.fa-solid');
                    const regular = w.querySelector('.fa-regular');
                    
                    // Reset
                    if (solid && regular) {
                        if (starValue <= value) {
                            solid.classList.remove('d-none');
                            regular.classList.add('d-none');
                        } else {
                            solid.classList.add('d-none');
                            regular.classList.remove('d-none');
                        }
                    }
                });
            };

            starsContainer.addEventListener('click', function (e) {
                const wrapper = e.target.closest('.star-wrapper');
                if (!wrapper) return;

                const value = parseInt(wrapper.dataset.value);
                currentRating = value;
                ratingInput.value = value;
                
                updateStars(currentRating);
                
                ratingText.textContent = `Գնահատական՝ ${value}/5`;
                ratingText.classList.add('text-warning', 'fw-bold');
                
                // Add a small animation pulse
                wrapper.style.transform = 'scale(1.3)';
                setTimeout(() => wrapper.style.transform = 'scale(1.2)', 200);
            });

            // Hover effects
            starsContainer.addEventListener('mouseover', function(e) {
                const wrapper = e.target.closest('.star-wrapper');
                if (!wrapper) return;
                
                const value = parseInt(wrapper.dataset.value);
                updateStars(value);
                
                // Scale effect
                 wrappers.forEach(w => {
                    if (parseInt(w.dataset.value) <= value) {
                        w.style.transform = 'scale(1.2)';
                    } else {
                        w.style.transform = 'scale(1)';
                    }
                 });
            });

            starsContainer.addEventListener('mouseout', function(e) {
                updateStars(currentRating);
                wrappers.forEach(w => w.style.transform = 'scale(1)');
            });
        }

        // Form Submission
        reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const rating = ratingInput.value;
            if (!rating) {
                handlerNotify('Խնդրում ենք ընտրել գնահատականը (աստղերը)', 'warning');
                return;
            }

            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            setFormLoading(this, true);
            btn.innerHTML = 'Ուղարկվում է...';

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            const result = await doAxios('/api/v1/review', 'POST', data);

            setFormLoading(this, false);
            btn.innerHTML = originalText;

            if (result.success) {
                handlerNotify('Շնորհակալություն ձեր կարծիքի համար', 'success');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                handlerNotify(result.message || 'Սխալ տեղի ունեցավ', 'danger');
            }
        });
    }
});
