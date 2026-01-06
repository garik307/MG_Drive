(function(){
            const filterEl = document.getElementById('galleryDateFilter');
            const searchEl = document.getElementById('gallerySearchInput');
            const cards = Array.from(document.querySelectorAll('.image-card'));

            function applyFilters(){
                const days = filterEl ? filterEl.value : 'all';
                const q = (searchEl?.value || '').toLowerCase().trim();
                const now = new Date();
                let threshold = null;
                if (days !== 'all') {
                    threshold = new Date(now);
                    threshold.setDate(now.getDate() - parseInt(days, 10));
                }
                cards.forEach(card => {
                    const iso = card.getAttribute('data-date');
                    const title = (card.getAttribute('data-title') || '').toLowerCase();
                    const text = (card.getAttribute('data-text') || '').toLowerCase();
                    let passDate = true;
                    if (threshold && iso) {
                        const d = new Date(iso);
                        passDate = d >= threshold;
                    }
                    const passSearch = q ? (title.includes(q) || text.includes(q)) : true;
                    card.style.display = (passDate && passSearch) ? '' : 'none';
                });
            }
            filterEl && filterEl.addEventListener('change', applyFilters);
            searchEl && searchEl.addEventListener('input', applyFilters);
            applyFilters();
        })();
        document.querySelectorAll('.image-card .btn-edit').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const card = btn.closest('.image-card');
                const id = card?.dataset.id;
                const title = card?.dataset.title || '';
                const text = card?.dataset.text || '';
                const image = card?.dataset.image || '';

                const form = document.getElementById('galleryEditForm');
                form.action = '/api/v1/gallery/' + id;

                const titleInput = form.querySelector('input[name="title"]');
                const textArea = form.querySelector('textarea[name="text"]');
                const preview = document.getElementById('galleryEditImagePreview');

                if (titleInput) titleInput.value = title;
                if (textArea) textArea.value = text;
                if (preview) {
                    preview.innerHTML = image 
                        ? `<img src="${image}" class="img-fluid rounded mb-2" style="max-height:250px;">` 
                        : '';
                }
                new bootstrap.Modal(document.getElementById('galleryEditModal')).show();
            });
        });