import DataSearchEngine from "./ui/DataSearchEngine.js";
import DataFilterManager from "./ui/DataFilterManager.js";
import PaginationManager from "./ui/PaginationManager.js";
import Confirm from "./confirm.js";
import showNotification from "./ui/notificationManager.js";

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderCards(questions) {
    const container = document.getElementById("questionsList");
    if (!container) return;

    if (!questions || questions.length === 0) {
        container.innerHTML = '<div class="col-12 text-center p-5">Հարցեր չեն գտնվել</div>';
        return;
    }

    const html = questions.map(q => {
        let image = "../images/no-image.png";
        let hasImage = false;
        if(q.files) {
            const foundImage = Array.isArray(q.files) ? q.files.find(file => file.name_used === "question_img") : null;
            if (foundImage) {
                image = `../images/questions/large/${foundImage.name}.${foundImage.ext}`;
                hasImage = true;
            }
        }
        
        const correctIndex = Number(q.correctAnswerIndex);
        const isTest = q.owner && q.owner.type === 'test';
        const badgeClass = isTest ? 'bg-primary' : 'bg-warning';
        const label = (q.owner && q.owner.data) ? `${q.owner.data.title}-${q.owner.data.number}-ի` : '';
        
        let optionsHtml = '';
        if (q.options && q.options.length) {
            optionsHtml = `<div class="question-answers mb-3">
                <div class="small text-muted mb-2">Պատասխաններ:</div>
                ${q.options.map((opt, idx) => `
                    <div class="answer-item ${(idx + 1 === correctIndex) ? 'correct' : ''}">
                        <span class="fw-normal fs-6">${escapeHtml(opt)}</span>
                    </div>
                `).join('')}
            </div>`;
        }

        let imageHtml = '';
        if (hasImage) {
            imageHtml = `
                <img src="${image}" alt="Question" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="question-image-placeholder" style="display:none;">
                    <i class="bi bi-image"></i>
                    <span>Նկար</span>
                </div>
            `;
        } else {
            imageHtml = `
                <div class="question-image-placeholder">
                    <i class="bi bi-image"></i>
                    <span>Նկար չկա</span>
                </div>
            `;
        }

        return `
            <div class="col-xl-4 col-lg-6 col-sm-12 mb-4 question-col-card" data-id="${q.id}">
                <div class="question-card">
                    <div class="question-image">
                        ${imageHtml}
                    </div>
                    <div class="question-body">
                        <div class="question-title">${escapeHtml(q.question).slice(0, 100)}</div>
                        <div class="question-full-text d-none">${escapeHtml(q.question)}</div>
                        
                        <div class="d-flex gap-2 justify-content-between">
                            <p class="text-dark badge fs-6 ${badgeClass}">${label} Հարց #${q.number}</p>
                        </div>

                        ${optionsHtml}

                        <div class="mt-3 d-flex justify-content-end gap-2">
                            <button type="button" class="btn btn-sm btn-outline-primary btn-edit"
                                data-id="${q.id}">
                                Խմբագրել
                            </button>

                            <button type="button" class="btn btn-sm btn-outline-danger btn-delete" data-id="${q.id}">
                                <i class="bi bi-trash me-1"></i>Ջնջել
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function initQuestionModal() {
    let answerCounter = 0;
    const question = document.querySelector('#questions');
    if (!question) return;
    const tableNameInput = document.querySelector('#table_name');
    const testSelect = document.getElementById('modalFilterTest');
    const groupSelect = document.getElementById('modalFilterGroup');
    const addAnswerBtn = document.getElementById('addAnswerBtn');
    const answersContainer = document.getElementById('answersContainer');

    function updateRowIdNames() {
        if (testSelect.value) {
            testSelect.setAttribute("name", "row_id");
            testSelect.classList.add("validate");
            groupSelect.removeAttribute("name");
            groupSelect.classList.remove("validate");
        } else if (groupSelect.value) {
            groupSelect.setAttribute("name", "row_id");
            groupSelect.classList.add("validate");
            testSelect.removeAttribute("name");
            testSelect.classList.remove("validate");
        }
    }

    testSelect.addEventListener('change', () => {
        if (testSelect.value) groupSelect.value = "";
        updateRowIdNames();
        updateTableName();
    });

    groupSelect.addEventListener('change', () => {
        if (groupSelect.value) testSelect.value = "";
        updateRowIdNames();
        updateTableName();
    });

    addAnswerBtn.addEventListener('click', () => {
        answerCounter++;
        const div = document.createElement('div');
        div.className = 'answer-input-group input-group mb-2';
        div.dataset.answerId = answerCounter;
        div.innerHTML = `
            <input type="text" class="form-control" name="answer_item" placeholder="Պատասխան ${answerCounter}" data-answer-text>
            <div class="input-group-text">
                <input type="checkbox" name="correctAnswerIndex" class="form-check-input mt-0 answer-correct" 
                    data-answer-correct data-index="${answerCounter}">
            </div>
            <span class="input-group-text" data-correct-label>Ճիշտ</span>
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-answer" data-remove-answer>
                <i class="bi bi-trash"></i>
            </button>
        `;
        answersContainer.appendChild(div);
    });

    answersContainer.addEventListener('change', e => {
        if (e.target.matches('[data-answer-correct]')) {
            document.querySelectorAll('[data-answer-correct]').forEach(chk => {
                if (chk !== e.target) chk.checked = false;
            });
            e.target.value = e.target.dataset.index;
        }
    });

    answersContainer.addEventListener('click', e => {
        if (!e.target.matches('[data-correct-label]')) return;
        const group = e.target.closest('.answer-input-group');
        if (!group) return;
        const checkbox = group.querySelector('[data-answer-correct]');
        if (!checkbox) return;
        if (!checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });

    answersContainer.addEventListener('click', e => {
        const btn = e.target.closest('[data-remove-answer]');
        if (!btn) return;
        const group = btn.closest('.answer-input-group');
        const checkbox = group.querySelector('[data-answer-correct]');
        if (checkbox.checked) {
            alert("Այս պատասխանը ընտրված է որպես ճիշտ, չես կարա ջնջես։");
            return;
        }
        group.remove();
    });

    updateRowIdNames();
    function updateTableName() {
        if (testSelect.value) tableNameInput.value = "tests";
        else if (groupSelect.value) tableNameInput.value = "groups";
    }
}

function initEditModal() {
    const editModalEl = document.getElementById("questionEditModal");
    if(!editModalEl) return;
    
    const editForm = document.getElementById("questionEditForm");
    const editTestSelect = document.getElementById("editTestSelect");
    const editGroupSelect = document.getElementById("editGroupSelect");
    const editTableName = document.getElementById("editTableName");
    const editQuestionText = document.getElementById("editQuestionText");
    const editAnswersContainer = document.getElementById("editAnswersContainer");
    const editCorrect = document.getElementById("editCorrectAnswerIndex");
    const editImagePreview = document.getElementById("editImagePreview");
    
    // Select Logic
    editTestSelect.addEventListener("change", () => {
        if (editTestSelect.value) {
            editTestSelect.setAttribute("name", "row_id");
            editGroupSelect.removeAttribute("name");
            editGroupSelect.value = "";
            editTableName.value = "tests";
        }
    });
    editGroupSelect.addEventListener("change", () => {
        if (editGroupSelect.value) {
            editGroupSelect.setAttribute("name", "row_id");
            editTestSelect.removeAttribute("name");
            editTestSelect.value = "";
            editTableName.value = "groups";
        }
    });

    // Add Answer
    document.getElementById("editAddAnswerBtn").addEventListener("click", () => {
        addAnswerRow("");
        updateIndexes();
    });

    function addAnswerRow(text, isCorrect = false, index = null) {
        const i = index || editAnswersContainer.children.length + 1;
        const div = document.createElement("div");
        div.className = "input-group mb-2 answer-row";
        div.innerHTML = `
            <input type="text" name="answer_item" class="form-control" value="${escapeHtml(text)}" placeholder="Պատասխան ${i}">
            <span class="input-group-text">
                <input type="checkbox" class="form-check-input answer-correct" data-index="${i}" ${isCorrect ? "checked" : ""}>
            </span>
            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-answer">
                <i class="bi bi-trash"></i>
            </button>
        `;
        editAnswersContainer.appendChild(div);
    }

    // Correct Answer (Radio)
    editAnswersContainer.addEventListener("change", (e) => {
        if (!e.target.classList.contains("answer-correct")) return;
        const index = e.target.dataset.index;
        editAnswersContainer.querySelectorAll(".answer-correct").forEach(chk => {
            if (chk !== e.target) chk.checked = false;
        });
        editCorrect.value = index;
    });

    // Delete Answer
    editAnswersContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-remove-answer");
        if (!btn) return;
        const row = btn.closest(".answer-row");
        const chk = row.querySelector(".answer-correct");
        if (chk.checked) {
            alert("Չես կարա ջնջես ճիշտ պատասխանը։");
            return;
        }
        row.remove();
        updateIndexes();
    });

    function updateIndexes() {
        let i = 1;
        editAnswersContainer.querySelectorAll(".answer-row").forEach(row => {
            const chk = row.querySelector(".answer-correct");
            chk.dataset.index = i;
            if (chk.checked) editCorrect.value = i;
            i++;
        });
    }

    // DELEGATION: Open Modal
    document.getElementById("questionsList").addEventListener("click", (e) => {
        const btn = e.target.closest(".btn-edit");
        if(!btn) return;
        
        const id = btn.dataset.id;
        // Find data in window.allQuestions
        const q = window.allQuestions.find(item => String(item.id) === String(id));
        if(!q) return;

        // Populate Form
        editForm.action = `/api/v1/question/${q.id}`;
        
        editTestSelect.removeAttribute("name");
        editGroupSelect.removeAttribute("name");
        editTestSelect.value = "";
        editGroupSelect.value = "";

        if (q.table_name === "tests") {
            editTestSelect.value = q.row_id;
            editTestSelect.setAttribute("name", "row_id");
            editTableName.value = "tests";
        } else {
            editGroupSelect.value = q.row_id;
            editGroupSelect.setAttribute("name", "row_id");
            editTableName.value = "groups";
        }

        editQuestionText.value = q.question;
        
        // Image
        editImagePreview.innerHTML = "";
        if(q.files) {
             const foundImage = Array.isArray(q.files) ? q.files.find(file => file.name_used === "question_img") : null;
             if(foundImage) {
                 const src = `../images/questions/large/${foundImage.name}.${foundImage.ext}`;
                 editImagePreview.innerHTML = `<img src="${src}" class="img-fluid rounded mb-2" style="max-height:250px;"><hr>`;
             }
        }

        // Answers
        editAnswersContainer.innerHTML = "";
        editCorrect.value = "";
        if(q.options && q.options.length) {
            q.options.forEach((opt, idx) => {
                const isCorrect = (idx + 1) === Number(q.correctAnswerIndex);
                addAnswerRow(opt, isCorrect, idx + 1);
                if(isCorrect) editCorrect.value = idx + 1;
            });
        }
        updateIndexes();

        new bootstrap.Modal(editModalEl).show();
    });

    // DELEGATION: Delete Question
    document.getElementById("questionsList").addEventListener("click", async (e) => {
        const btn = e.target.closest(".btn-delete");
        if (!btn) return;
        
        const id = btn.dataset.id;
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
            // Using axios if available globally or fetch if not. 
            // Assuming axios is available as per other files.
            const res = await axios({ url: `/api/v1/question/${id}`, method: 'DELETE' });
            if (res && res.status < 400) {
                showNotification('Հաջողությամբ ջնջվեց', 'success');
                // Remove card from DOM
                const card = document.querySelector(`.question-col-card[data-id="${id}"]`);
                if (card) card.remove();
                
                // Also update window.allQuestions if needed
                if (window.allQuestions) {
                    window.allQuestions = window.allQuestions.filter(q => String(q.id) !== String(id));
                }
            } else {
                showNotification('Սխալ է առաջացել', 'error');
            }
        } catch (e) {
            console.error(e);
            const msg = e?.response?.data?.message || 'Սերվերի սխալ';
            showNotification(msg, 'error');
        }
    });
}

const removeImageBtn = document.getElementById('removeImageBtn');
if (removeImageBtn) {
    removeImageBtn.addEventListener('click', () => {
        let imagCrop = document.querySelector('.img-cropper-container');
        let img = imagCrop.querySelector('img')
        let input = imagCrop.querySelector('input[type="file"]');
        if(input) input.remove();
        if(img) img.remove();
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    initQuestionModal();
    initEditModal();
    
    // Fetch data asynchronously
    let fetchError = false;
    try {
        const response = await fetch('/api/v1/question');
        const data = await response.json();
        if (data.status === 'success' && Array.isArray(data.questions)) {
             window.allQuestions = data.questions;
        }
    } catch (e) {
        console.error('Failed to fetch questions:', e);
        fetchError = true;
        const container = document.getElementById("questionsList");
        if (container) container.innerHTML = '<div class="col-12 text-center p-5 text-danger">Չհաջողվեց բեռնել հարցերը</div>';
    }

    if (fetchError) return;

    // DATA SOURCE
    const allData = window.allQuestions || [];
    let filteredByTable = [...allData];
    let filteredFinal = [...allData];

    // PAGINATION
    const paginator = new PaginationManager({
        container: document.getElementById("questionsPag"),
        itemsPerPage: 51
    });

    // RENDER FUNCTION
    const refreshView = () => {
        // Calculate slice
        const page = paginator.currentPage;
        const start = (page - 1) * paginator.itemsPerPage;
        const end = start + paginator.itemsPerPage;
        const slice = filteredFinal.slice(start, end);
        
        renderCards(slice);
    };

    // SEARCH ENGINE
    const searchEngine = new DataSearchEngine({
        data: filteredByTable,
        inputSelector: "#searchInput",
        onSearch: (results) => {
            filteredFinal = results;
            paginator.setTotal(filteredFinal.length);
            // If search changes, go to page 1
            if(paginator.currentPage > paginator.totalPages) paginator.setPage(1);
            
            // Re-render pagination because total pages changed
            paginator.render();
            refreshView();
        }
    });

    // FILTER MANAGER
    new DataFilterManager({
        data: allData,
        testSelectSelector: "#filterTest",
        groupSelectSelector: "#filterGroup",
        onFilter: (results) => {
            filteredByTable = results;
            // Update search engine data source
            searchEngine.updateData(filteredByTable);
            // Search engine will trigger onSearch automatically or we call it?
            // updateData calls _search() which calls onSearch.
        }
    });

    // PAGINATION EVENTS
    paginator.onPageChange = (page) => {
        refreshView();
        // Scroll to top of list
        const list = document.getElementById("questionsList");
        if(list) list.scrollIntoView({ behavior: "smooth" });
    };

    // Force initial render if data is empty (to show "No questions" or clear spinner)
    // But searchEngine usually triggers onSearch on init?
    // DataSearchEngine usually triggers onSearch in constructor if input is empty.
    // If allData is empty, it renders empty.
    
    // If fetch failed or returned empty, we need to ensure spinner is removed or updated.
    if (allData.length === 0) {
        renderCards([]);
    }
});
