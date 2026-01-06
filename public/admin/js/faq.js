function faqs(){
            const list = document.getElementById('faqList');
            const editModalEl = document.getElementById('editFaqModal');
            const editIdEl = document.getElementById('editFaqId');
            const editQEl = document.getElementById('editFaqQuestion');
            const editAEl = document.getElementById('editFaqAnswer');
            const updateBtn = document.getElementById('updateFaqBtn');

            list?.addEventListener('click', function(e){
                const btn = e.target.closest('button[data-act]');
                if (!btn) return;
                const act = btn.getAttribute('data-act');
                const id = btn.getAttribute('data-id');
                if (act === 'edit') {
                    const q = btn.getAttribute('data-question') || '';
                    const a = btn.getAttribute('data-answer') || '';
                    if (editIdEl) editIdEl.value = id;
                    if (editQEl) editQEl.value = q;
                    if (editAEl) editAEl.value = a;
                    new bootstrap.Modal(editModalEl).show();
                }
            });

            updateBtn?.addEventListener('click', async function(){
                const id = editIdEl?.value;
                const title = editQEl?.value?.trim() || '';
                const text = editAEl?.value?.trim() || '';
                if (!id || !title || !text) {
                    try { showNotification('Լրացրեք բոլոր դաշտերը', 'error', 2500); } catch {}
                    return;
                }
                try {
                    const resp = await fetch('/api/v1/faq/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title, text })
                    });
                    if (!resp.ok) throw new Error('Update failed');
                    const data = await resp.json();
                    const item = document.querySelector('.faq-item[data-id="' + id + '"]');
                    if (item) {
                        const qEl = item.querySelector('.faq-question p');
                        const aEl = item.querySelector('.faq-answer');
                        const editBtn = item.querySelector('button[data-act="edit"]');
                        if (qEl) qEl.textContent = title;
                        if (aEl) aEl.textContent = text;
                        if (editBtn) {
                            editBtn.setAttribute('data-question', title);
                            editBtn.setAttribute('data-answer', text);
                        }
                    }
                    try { showNotification('Հաջողությամբ թարմացվեց', 'success', 2000); } catch {}
                    bootstrap.Modal.getInstance(editModalEl)?.hide();
                } catch (err) {
                    try { showNotification('Թարմացումը չհաջողվեց', 'error', 2500); } catch {}
                }
            });
        }
        faqs();