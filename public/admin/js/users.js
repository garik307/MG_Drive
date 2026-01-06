document.addEventListener('DOMContentLoaded', function () {
    const filterSelect = document.getElementById('filterStatus');
    const searchInput = document.getElementById('searchInput');
    const tableBody = document.getElementById('usersTableBody');

    async function fetchUsers() {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        
        try {
            const res = await axios.get('/admin/users', {
                params: {
                    search: params.get('search') || '',
                    role: params.get('role') || '',
                    page: params.get('page') || 1
                },
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (res.data) {
                // If the response is JSON (which it should be now), update both areas
                if (typeof res.data === 'object') {
                    if (res.data.table) tableBody.innerHTML = res.data.table;
                    if (res.data.pagination) {
                        const paginationContainer = document.getElementById('paginationContainer');
                        if (paginationContainer) paginationContainer.innerHTML = res.data.pagination;
                    }
                } else {
                    // Fallback for string response (just table)
                    tableBody.innerHTML = res.data;
                }
                
                // Re-attach event listeners for new buttons
                attachEventListeners();
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    }

    function updateQueryParam(key, value) {
        const url = new URL(window.location.href);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        url.searchParams.set('page', 1); // Reset to page 1
        
        // Update URL without reloading
        window.history.pushState({}, '', url);
        fetchUsers();
    }

    if (filterSelect) {
        // Set initial value from URL
        const urlParams = new URLSearchParams(window.location.search);
        const roleVal = urlParams.get('role');
        if (roleVal) {
            filterSelect.value = roleVal;
        }

        filterSelect.addEventListener('change', () => {
            updateQueryParam('role', filterSelect.value);
        });
    }

    if (searchInput) {
        // Set initial value from URL
        const urlParams = new URLSearchParams(window.location.search);
        const searchVal = urlParams.get('search');
        if (searchVal) {
            searchInput.value = searchVal;
        }

        let timeout = null;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                updateQueryParam('search', searchInput.value.trim());
            }, 500);
        });
    }
    
    function attachEventListeners() {
        // Re-attach modal listeners
        const idInput = document.getElementById('editUserId');
        const nameInput = document.getElementById('editUserName');
        const emailInput = document.getElementById('editUserEmail');
        const roleSelect = document.getElementById('editUserRole');
        const isPaidCheckbox = document.getElementById('editUserIsPaid');

        document.querySelectorAll('[data-bs-target="#editUserRoleModal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                if(idInput) idInput.value = btn.getAttribute('data-user-id') || '';
                if(nameInput) nameInput.value = btn.getAttribute('data-user-name') || '';
                if(emailInput) emailInput.value = btn.getAttribute('data-user-email') || '';
                
                const role = btn.getAttribute('data-user-role') || '';
                if (role && roleSelect) roleSelect.value = role;
                
                const isPaid = btn.getAttribute('data-user-is-paid') === 'true';
                if (isPaidCheckbox) isPaidCheckbox.checked = isPaid;
            });
        });

        // Re-attach delete listeners
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-user-id');
                if (!id) return;
                const confirm = new Confirm();
                const yes = await confirm.open({
                    title: 'Վստահ ե՞ք, որ ցանկանում եք ջնջել',
                    message: 'Այս գործողությունը հետ չես բերի։<br><b>Շարունակե՞լ</b>',
                    okText: 'Ջնջել',
                    cancelText: 'Չեղարկել',
                    okClass: 'btn-danger'
                });
                if (!yes) return;
                try {
                    const res = await axios({ url: `/api/v1/user/${id}`, method: 'DELETE' });
                    if (res && res.status === 204) {
                        showNotification('Հաջողությամբ ջնջվեց', 'success');
                        // Refresh list
                        fetchUsers(); 
                    } else {
                        showNotification('Սխալ է առաջացել', 'error');
                    }
                } catch (e) {
                    const msg = e?.response?.data?.message || 'Սերվերի սխալ';
                    showNotification(msg, 'error');
                }
            });
        });
    }

    // Pagination event delegation
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.addEventListener('click', function(e) {
            if (e.target.matches('.page-link') || e.target.closest('.page-link')) {
                const link = e.target.matches('.page-link') ? e.target : e.target.closest('.page-link');
                const href = link.getAttribute('href');
                
                // If it's disabled or just a placeholder like "...", ignore
                if (!href || link.parentElement.classList.contains('disabled')) {
                    e.preventDefault();
                    return;
                }

                e.preventDefault();
                // Extract params from href (it's relative like "?page=2...")
                // We construct a full URL to parse it easily
                const url = new URL(href, window.location.origin + window.location.pathname);
                
                // Update URL without reloading
                window.history.pushState({}, '', url);
                
                // Trigger fetch
                fetchUsers(); 
            }
        });
    }

    // Handle back/forward browser buttons
    window.addEventListener('popstate', fetchUsers);

    // Initial attach
    attachEventListeners();

    const modalEl = document.getElementById('editUserRoleModal');
    if (!modalEl) return;
    const roleSelect = document.getElementById('editUserRole');
    const isPaidCheckbox = document.getElementById('editUserIsPaid');
    const idInput = document.getElementById('editUserId');
    const nameInput = document.getElementById('editUserName');
    const emailInput = document.getElementById('editUserEmail');
    const saveBtn = document.getElementById('saveUserRoleBtn');

    saveBtn.addEventListener('click', async () => {
        const id = (idInput.value || '').trim();
        const role = (roleSelect.value || '').trim();
        const isPaid = isPaidCheckbox ? isPaidCheckbox.checked : false;
        const name = (nameInput.value || '').trim();
        const email = emailInput ? (emailInput.value || '').trim() : '';
        
        if (!id || !role) return;
        saveBtn.disabled = true;
        try {
            const data = { role, isPaid };
            if (name) data.name = name;
            if (email) data.email = email;

            const res = await axios({
                url: `/api/v1/user/${id}`,
                method: 'PATCH',
                data: data,
                headers: { 'Content-Type': 'application/json' }
            });
            if (res && res.status < 400) {
                showNotification('Հաջողությամբ թարմացվեց', 'success');
                // Close modal
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
                // Refresh list
                fetchUsers();
            } else {
                showNotification('Սխալ է առաջացել', 'error');
            }
        } catch (e) {
            let msg = 'Սերվերի սխալ';
            if (e?.response?.data?.message) {
                msg = e.response.data.message;
                // Translate common error messages
                const translations = {
                    'User not found.': 'Օգտատերը չի գտնվել',
                    'Something went wrong!': 'Տեղի է ունեցել սխալ, խնդրում ենք փորձել կրկին',
                    'Invalid token. Please log in.': 'Անվավեր տոկեն։ Խնդրում ենք մուտք գործել կրկին',
                    'Your token has expired. Please log in again.': 'Տոկենի ժամկետը լրացել է։ Խնդրում ենք մուտք գործել կրկին',
                    'No user found with that email': 'Այդ էլ․ հասցեով օգտատեր չի գտնվել'
                };

                if (translations[msg]) {
                    msg = translations[msg];
                } else if (msg.includes('email already exists')) {
                    msg = 'Էլ․ հասցեն արդեն զբաղված է';
                } else if (msg.includes('Duplicate field value')) {
                    msg = 'Տվյալ դաշտի արժեքը արդեն գոյություն ունի';
                }
            }
            showNotification(msg, 'error');
        } finally {
            saveBtn.disabled = false;
        }
    });
});
