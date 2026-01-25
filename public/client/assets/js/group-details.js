document.addEventListener('DOMContentLoaded', async () => {
    // 1. Data from DOM
    const root = document.getElementById("groupRoot");
    if (!root) return;
    
    let groupData = {};
    try {
        groupData = JSON.parse(root.dataset.group);
    } catch (e) {
        console.error("Error parsing group data", e);
        return;
    }

    if (!groupData || !groupData.id) {
        console.error('Group data not found');
        return;
    }

    // 2. State
    let userAnswers = {}; 
    let totalQuestions = 0;
    let currentLimit = 20;
    let startTime = Date.now();
    
    // Fix: Scope storage to user
    const userId = root.dataset.userId || 'guest';
    const STORAGE_KEY = `mg_user_${userId}_group_${groupData.id}_answers`;

    // 3. DOM Elements
    const els = {
        container: document.getElementById('questions-container'),
        totalCountBadge: document.getElementById('totalCountBadge'),
        resultModal: typeof bootstrap !== 'undefined' ? new bootstrap.Modal(document.getElementById('resultModal')) : null,
        correctCount: document.getElementById('correctCount'),
        wrongCount: document.getElementById('wrongCount'),
        timeSpentBadge: document.getElementById('timeSpentBadge'),
        scorePercent: document.getElementById('scorePercent'),
        limitSelect: document.getElementById('limitSelect'),
        pagination: document.getElementById('questionsPag'),
        btnRetry: document.getElementById('btnRetry'),
        resetProgressBtn: document.getElementById('resetProgressBtn'),
        resetConfirmModal: typeof bootstrap !== 'undefined' ? new bootstrap.Modal(document.getElementById('resetConfirmModal')) : null,
        confirmResetBtnAction: document.getElementById('confirmResetBtnAction')
    };

    // 4. Initialization Logic
    async function init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);

            // Restore answers from DB
            userAnswers = await loadProgressDB();
            
            // Restore limit from URL
            const limitParam = urlParams.get('limit');
            if (limitParam) {
                currentLimit = parseInt(limitParam);
                if (els.limitSelect) els.limitSelect.value = currentLimit;
            }

            // Initial Load
            const page = parseInt(urlParams.get('page')) || 1;
            await loadQuestions(page);

        } catch (error) {
            console.error('Error initializing group details:', error);
            showNotification('Սխալ տեղի ունեցավ էջը բեռնելիս: ' + error.message, 'error');
        }
    }

    // 5. Event Listeners

    // Retry Button
    if(els.btnRetry) {
        els.btnRetry.addEventListener('click', clearAndReload);
    }

    // Reset Progress Button
    if(els.resetProgressBtn) {
        els.resetProgressBtn.addEventListener('click', () => {
             if (els.resetConfirmModal) {
                 els.resetConfirmModal.show();
             } else if(confirm('Ցանկանու՞մ եք սկսել նորից: Բոլոր պատասխանները կջնջվեն:')) {
                 performReset();
             }
        });
    }

    // Modal Action
    if(els.confirmResetBtnAction) {
        els.confirmResetBtnAction.addEventListener('click', async () => {
            const btn = els.confirmResetBtnAction;
            const originalContent = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btn.disabled = true;
            
            await performReset(btn, originalContent);
        });
    }

    async function performReset(btn = null, originalContent = '') {
         try {
            // console.log('Resetting progress...');
            userAnswers = {};
            const success = await saveProgressDB({});
            
            if (success) {
                const url = new URL(window.location);
                url.searchParams.set('page', 1);
                window.location.href = url.toString();
            } else {
                showNotification('Սխալ տեղի ունեցավ: Չհաջողվեց ջնջել տվյալները:', 'error');
                if(btn) {
                    btn.innerHTML = originalContent;
                    btn.disabled = false;
                    if(els.resetConfirmModal) els.resetConfirmModal.hide();
                }
            }
        } catch (e) {
            console.error('Error resetting progress', e);
            showNotification('Սխալ տեղի ունեցավ', 'error');
            if(btn) {
                 btn.innerHTML = originalContent;
                 btn.disabled = false;
                 if(els.resetConfirmModal) els.resetConfirmModal.hide();
            }
        }
    }

    // Filter Listener
    if(els.limitSelect) {
        els.limitSelect.addEventListener('change', (e) => {
            currentLimit = Number(e.target.value);
            
            // Update URL for limit
            const url = new URL(window.location);
            url.searchParams.set('limit', currentLimit);
            url.searchParams.set('page', 1); 
            history.replaceState({}, "", url);

            loadQuestions(1);
        });
    }

    // Event Delegation for Questions Container
    if(els.container) {
        els.container.addEventListener('click', (e) => {
            // Option Click
            const optionDiv = e.target.closest('.answer-option');
            if(optionDiv && !optionDiv.classList.contains('disabled')) {
                const globalIndex = parseInt(optionDiv.dataset.globalIndex);
                const optIdx = parseInt(optionDiv.dataset.optIdx);
                const correctIdx = parseInt(optionDiv.dataset.correctIdx);
                checkAnswer(globalIndex, optIdx, correctIdx);
                return;
            }

            // Image Click
            const imgWrapper = e.target.closest('.question-image-wrapper');
            if(imgWrapper) {
                const img = imgWrapper.querySelector('img');
                if(img) openImageModal(img.src);
            }
        });
    }

    // 6. Core Functions

    async function saveProgressDB(answers) {
        try {
            const res = await fetch(`/api/v1/groups/${groupData.id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers })
            });
            if (!res.ok) {
                console.error('Failed to save progress:', res.status);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Error saving progress to DB', e);
            return false;
        }
    }

    async function loadProgressDB() {
        try {
            const res = await fetch(`/api/v1/groups/${groupData.id}/progress`);
            const json = await res.json();
            if (json.status === 'success' && json.answers) {
                return json.answers;
            }
        } catch (e) {
            console.error('Error loading progress from DB', e);
        }
        return {};
    }

    function renderPaginationInline(total, limit, currentPage) {
        const container = els.pagination;
        if(!container) return;
        container.innerHTML = '';
        
        const totalPages = Math.ceil(total / limit);
        if(totalPages <= 0) return;

        const nav = document.createElement("div");
        nav.className = "pagination-nav";
        const ul = document.createElement("ul");
        ul.className = "pagination justify-content-center flex-wrap";

        const createPageItem = (page, text, isActive = false, isDisabled = false) => {
            const li = document.createElement("li");
            li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
            
            const a = document.createElement("a");
            a.className = "page-link";
            a.innerHTML = text;
            a.href = "#";
            
            if(!isDisabled && !isActive) {
                a.onclick = (e) => {
                    e.preventDefault();
                    updatePage(page);
                };
            }
            
            li.appendChild(a);
            ul.appendChild(li);
        };

        // Prev
        createPageItem(currentPage - 1, '<i class="fa-solid fa-chevron-left"></i>', false, currentPage === 1);

        // Pages
        if (totalPages <= 7) {
                for(let i=1; i<=totalPages; i++) createPageItem(i, i, i === currentPage);
        } else {
                createPageItem(1, 1, 1 === currentPage);
                if(currentPage > 3) createPageItem(null, '...', false, true);
                
                let start = Math.max(2, currentPage - 1);
                let end = Math.min(totalPages - 1, currentPage + 1);
                
                if (currentPage <= 3) end = 4;
                if (currentPage >= totalPages - 2) start = totalPages - 3;
                
                for(let i=start; i<=end; i++) createPageItem(i, i, i === currentPage);
                
                if(currentPage < totalPages - 2) createPageItem(null, '...', false, true);
                createPageItem(totalPages, totalPages, totalPages === currentPage);
        }

        // Next
        createPageItem(currentPage + 1, '<i class="fa-solid fa-chevron-right"></i>', false, currentPage === totalPages);

        nav.appendChild(ul);
        container.appendChild(nav);
        container.style.display = 'flex';
    }

    function updatePage(page) {
        const url = new URL(window.location);
        url.searchParams.set('page', page);
        history.replaceState({}, "", url);
        loadQuestions(page);
    }

    async function clearAndReload() {
        try {
            await saveProgressDB({});
        } catch (e) {
            console.error("Error clearing progress:", e);
        }
        
        const url = new URL(window.location);
        url.searchParams.delete('retry');
        url.searchParams.set('page', 1);
        window.location.href = url.toString();
    }

    async function loadQuestions(page) {
        els.container.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 text-muted">Հարցերի բեռնում...</p>
            </div>
        `;
        
        try {
            const res = await fetch(`/api/v1/groups/${groupData.id}/questions?page=${page}&limit=${currentLimit}`);
            if (!res.ok) throw new Error('Network response was not ok');
            
            const json = await res.json();
            
            if (json.status === 'success') {
                const { total, questions } = json.data;
                totalQuestions = total;
                
                // Auto-reset if test was fully completed previously
                if (total > 0 && Object.keys(userAnswers).length >= total) {
                    console.log('Test was fully completed previously, resetting for fresh start.');
                    userAnswers = {};
                    saveProgressDB({});
                }

                renderPaginationInline(total, currentLimit, page);
                
                if(els.totalCountBadge) els.totalCountBadge.innerText = `Ընդհանուր: ${total} հարց`;

                const startIndex = (page - 1) * currentLimit;
                renderQuestions(questions, startIndex);
                
                const headerCard = document.querySelector('.test-header-card');
                if(headerCard) headerCard.scrollIntoView({ behavior: 'smooth' });

            } else {
                throw new Error(json.message || 'Unknown error');
            }
        } catch (err) {
            els.container.innerHTML = `<div class="alert alert-danger">Սխալ: ${err.message}</div>`;
        }
    }

    function renderQuestions(list, startGlobalIndex) {
        els.container.innerHTML = '';
        
        if (list.length === 0) {
            els.container.innerHTML = '<div class="alert alert-info">Այս էջում հարցեր չկան:</div>';
            return;
        }

        list.forEach((q, i) => {
            const globalIndex = startGlobalIndex + i;
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-item animate__animated animate__fadeIn';
            questionDiv.id = `question-${globalIndex}`;
            
            // Image HTML
            let imageHtml = '';
            if (q.files && q.files.length > 0) {
                const file = q.files[0];
                const imgSrc = `/images/questions/large/${file.name}.${file.ext}`;
                // Removed onclick, handled by event delegation
                imageHtml = `
                    <div class="question-image-wrapper">
                        <img src="${imgSrc}" alt="Question Image">
                    </div>
                `;
            }

            // Options
            let options = [];
            if (typeof q.options === 'string') {
                try { options = JSON.parse(q.options); } catch(e) { options = []; }
            } else {
                options = q.options || [];
            }

            // Render Options HTML
            let optionsHtml = '<div class="answers-list" id="answers-list-' + globalIndex + '">';
            options.forEach((opt, optIdx) => {
                // Added data attributes for event delegation
                optionsHtml += `
                    <div class="answer-option" 
                         data-global-index="${globalIndex}" 
                         data-opt-idx="${optIdx}" 
                         data-correct-idx="${q.correctAnswerIndex}" 
                         id="opt-${globalIndex}-${optIdx}">
                        <div class="radio-circle"></div>
                        <div class="answer-text">${opt}</div>
                        <i class="status-icon fa-solid"></i>
                    </div>
                `;
            });
            optionsHtml += '</div>';

            questionDiv.innerHTML = `
                <div class="question-number">Հարց ${globalIndex + 1}</div>
                ${imageHtml}
                <div class="question-text"><h2>${q.question}</h2></div>
                ${optionsHtml}
            `;

            els.container.appendChild(questionDiv);
            
            // Restore state
            if (userAnswers[globalIndex]) {
                restoreAnswerState(globalIndex, userAnswers[globalIndex], q.correctAnswerIndex);
            }
        });
    }

    function checkAnswer(globalIndex, selectedIdx, correctAnswerIndex) {
        if (userAnswers[globalIndex]) return; 

        let correctIdx = Number(correctAnswerIndex) - 1;
        
        // Validation: Check if correctIdx is within bounds of available options
        const answersList = document.getElementById(`answers-list-${globalIndex}`);
        let isDataInvalid = false;
        
        if (answersList) {
            const optionsCount = answersList.children.length;
            if (Number.isNaN(correctIdx) || correctIdx < 0 || correctIdx >= optionsCount) {
                console.warn(`Question ${globalIndex}: Invalid correctAnswerIndex ${correctAnswerIndex} for ${optionsCount} options. Defaulting to user selection.`);
                isDataInvalid = true;
            }
        }

        // If data is invalid (e.g. missing correct answer in DB), assume user is correct
        // to avoid blocking progress or showing confusing UI.
        const isCorrect = isDataInvalid ? true : (selectedIdx === correctIdx);
        
        if (isDataInvalid) {
            correctIdx = selectedIdx; // Visually mark selected as correct
        }

        userAnswers[globalIndex] = {
            selectedIdx: selectedIdx,
            isCorrect: isCorrect
        };
        
        saveProgressDB(userAnswers);

        updateUIForAnswer(globalIndex, selectedIdx, correctIdx, isCorrect);

        if (totalQuestions > 0 && Object.keys(userAnswers).length === totalQuestions) {
            finishTest();
        }
    }

    function updateUIForAnswer(globalIndex, selectedIdx, correctIdx, isCorrect) {
        const answersList = document.getElementById(`answers-list-${globalIndex}`);
        if(!answersList) return;
        
        const options = answersList.children;

        // Ultimate Failsafe: If marked wrong (!isCorrect) but the "correct" answer 
        // doesn't exist (options[correctIdx] is missing), then the question data is broken.
        // In this case, we force it to be CORRECT to avoid showing "Red only" to the user.
        if (!isCorrect && !options[correctIdx]) {
            console.warn(`Question ${globalIndex}: Marked wrong but correctIdx ${correctIdx} is invalid. Treating as correct.`);
            isCorrect = true;
            correctIdx = selectedIdx;
        }
        
        // Highlight correct
        if (options[correctIdx]) {
            options[correctIdx].classList.add('correct');
            options[correctIdx].querySelector('.status-icon').classList.add('fa-circle-check');
        }
        
        // Highlight wrong if needed
        if (!isCorrect) {
            if (options[selectedIdx]) {
                options[selectedIdx].classList.add('wrong');
                options[selectedIdx].querySelector('.status-icon').classList.add('fa-circle-xmark');
            }
        }

        // Disable all options for this question
        Array.from(options).forEach(opt => {
            opt.classList.add('disabled');
        });
    }

    function restoreAnswerState(globalIndex, answerData, correctAnswerIndex) {
        let correctIdx = Number(correctAnswerIndex) - 1;

        // Fix: If saved state is correct, force UI to show selected as correct
        if (answerData.isCorrect) {
            correctIdx = answerData.selectedIdx;
        }

        // Validation for revisiting: If question data is broken (invalid correctIdx),
        // treat the saved answer as correct visually to avoid "Red with no Green" confusion.
        const answersList = document.getElementById(`answers-list-${globalIndex}`);
        if (answersList) {
             const optionsCount = answersList.children.length;
             if (Number.isNaN(correctIdx) || correctIdx < 0 || correctIdx >= optionsCount) {
                 // Invalid question data -> Show as Correct (Green)
                 updateUIForAnswer(globalIndex, answerData.selectedIdx, answerData.selectedIdx, true);
                 return;
             }
        }

        updateUIForAnswer(globalIndex, answerData.selectedIdx, correctIdx, answerData.isCorrect);
    }

    function openImageModal(src) {
        if (els.imageModal && els.modalImage) {
            els.modalImage.src = src;
            els.imageModal.show();
        }
    }

    function finishTest() {
        const answeredCount = Object.keys(userAnswers).length;
        const correct = Object.values(userAnswers).filter(a => a.isCorrect).length;
        const wrongAnswered = Object.values(userAnswers).filter(a => !a.isCorrect).length; 
        const unanswered = totalQuestions - answeredCount;
        const wrongTotal = wrongAnswered + unanswered;

        const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
        const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000); 
        
        const minutes = Math.floor(timeSpentSeconds / 60);
        const seconds = timeSpentSeconds % 60;
        const timeString = `${minutes}ր ${seconds}վ`;

        if (els.correctCount) els.correctCount.innerText = correct;
        if (els.wrongCount) els.wrongCount.innerText = wrongTotal; 
        
        if (els.scorePercent) els.scorePercent.innerText = score;
        if (els.timeSpentBadge) els.timeSpentBadge.innerText = timeString;

        const circle = document.getElementById('scoreCircle');
        if(circle) {
            circle.className = 'score-circle mb-4'; 
            if (score >= 90) circle.classList.add('high');
            else if (score >= 50) circle.classList.add('medium');
            else circle.classList.add('low');
        }

        if (els.resultModal) els.resultModal.show();

        const resultData = {
            groupId: groupData.id,
            score: score,
            correct_count: correct,
            wrong_count: wrongTotal,
            time_spent: timeSpentSeconds,
            status: score >= 90 ? 'passed' : 'failed'
        };

        fetch('/api/v1/groups/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        }).then(res => res.json())
            .then(data => {
                // console.log('Saved:', data);
                // Clear progress from DB
                saveProgressDB({});
            })
            .catch(err => console.error('Error saving result:', err));
    }

    // Start
    init();
});