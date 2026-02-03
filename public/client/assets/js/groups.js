document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.test-card');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            cards.forEach(card => {
                const col = card.closest('.group-col');
                if (!col) return;

                if (filter === 'all' || card.dataset.status === filter) {
                    col.style.display = '';
                } else {
                    col.style.display = 'none';
                }
            });
        });
    });

    // Reset Groups Logic
    const resetBtn = document.getElementById('resetGroupsBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            const confirmed = await showModalConfirm({
                title: 'Զրոյացնել արդյունքները', 
                message: 'Վստա՞հ եք, որ ցանկանում եք զրոյացնել ԽՄԲԵՐԻ բոլոր արդյունքները։ Այս գործողությունը անդարձելի է։',
                confirmText: 'Զրոյացնել',
                cancelText: 'Չեղարկել'
            });
            
            if (!confirmed) return;
            
            try {
                const res = await fetch('/api/v1/user/reset-groups', {
                    method: 'POST'
                });
                const data = await res.json();
                if(data.status === 'success') {
                    showNotification(data.message || 'Խմբերի արդյունքները զրոյացվեցին', 'success');
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showNotification(data.message || 'Սխալ տեղի ունեցավ', 'error');
                }
            } catch(e) {
                // console.error(e);
                showNotification('Սերվերի սխալ', 'error');
            }
        });
    }
});
