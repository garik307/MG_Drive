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
});
