document.addEventListener('DOMContentLoaded', () => {
    // 1. Data from DOM
    const testRoot = document.getElementById('testRoot');
    if (!testRoot) return;
    let testData = {};
    try {
        testData = JSON.parse(testRoot.dataset.test || '{}');
    } catch (e) {
        // console.error('Error parsing test data', e);
    }

    const questions = testData.questions || [];
    
    if (questions.length === 0) {
        showNotification('Այս թեստում հարցեր չկան', 'warning');
        return;
    }

    // 2. State
    let currentQuestionIndex = 0;
    let userAnswers = new Array(questions.length).fill(null); 
    let timeLeft = 30 * 60; // 30 minutes in seconds
    let startTime = Date.now();
    let timerInterval;

    // 3. DOM Elements
    const els = {
        testTitle: document.getElementById('testTitle'),
        timer: document.getElementById('timer'),
        progressText: document.getElementById('progressText'),
        progressBar: document.getElementById('progressBar'),
        questionImage: document.getElementById('questionImage'),
        imageWrapper: document.getElementById('imageWrapper'),
        questionText: document.getElementById('questionText'),
        answersList: document.getElementById('answersList'),
        nextBtn: document.getElementById('nextBtn'),
        navGrid: document.getElementById('navGrid'),
        resultModal: typeof bootstrap !== 'undefined' ? new bootstrap.Modal(document.getElementById('resultModal')) : null,
        correctCount: document.getElementById('correctCount'),
        wrongCount: document.getElementById('wrongCount'),
        timeSpentBadge: document.getElementById('timeSpentBadge'),
        scorePercent: document.getElementById('scorePercent')
    };

    // 4. Initialization
    function init() {
        startTimer();
        renderNavGrid();
        loadQuestion(0);
    }

    // 5. Event Listeners
    
    // Next Button
    if (els.nextBtn) {
        els.nextBtn.addEventListener('click', nextQuestion);
    }

    // Image Zoom
    if (els.zoomBtn) {
        els.zoomBtn.addEventListener('click', openImageModal);
    }

    // Retry Button
    const btnRetry = document.getElementById('btnRetry');
    if (btnRetry) {
        btnRetry.addEventListener('click', () => {
            location.reload();
        });
    }

    // Answers List Delegation
    if (els.answersList) {
        els.answersList.addEventListener('click', (e) => {
            const optionDiv = e.target.closest('.answer-option');
            if (optionDiv && !optionDiv.classList.contains('disabled')) {
                const idx = parseInt(optionDiv.dataset.idx);
                checkAnswer(idx);
            }
        });
    }

    // Navigation Grid Delegation
    if (els.navGrid) {
        els.navGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.nav-item');
            if (item) {
                const idx = parseInt(item.dataset.idx);
                loadQuestion(idx);
            }
        });
    }

    // 6. Logic Functions

    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                finishTest(true); // true = forced by timeout
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        if (!els.timer) return;
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        els.timer.innerText = `${m}:${s}`;
    }

    function loadQuestion(index) {
        currentQuestionIndex = index;
        const q = questions[index];

        // Update Progress
        if (els.progressText) els.progressText.innerText = `Հարց ${index + 1} / ${questions.length}`;
        if (els.progressBar) els.progressBar.style.width = `${((index + 1) / questions.length) * 100}%`;

        // Update Text
        if (els.questionText) els.questionText.innerText = q.question;

        // Update Image
        if (els.imageWrapper && els.questionImage) {
            let imgSrc = '/images/no-image.png';
            if (q.files && q.files.length > 0) {
                const file = q.files[0];
                imgSrc = `/images/questions/large/${file.name}.${file.ext}`;
            }
            
            els.questionImage.src = imgSrc;
            if (els.modalImage) els.modalImage.src = imgSrc;
            
            // Always show wrapper to maintain height/layout consistency
            els.imageWrapper.style.display = 'block'; 
        }

        // Reset UI
        if (els.nextBtn) els.nextBtn.disabled = true;
        
        // Render Answers
        renderAnswers(q);

        // Update Nav Grid highlight
        updateNavGrid();
    }

    function renderAnswers(q) {
        if (!els.answersList) return;
        els.answersList.innerHTML = '';
        let options = [];
        
        // Parse options if string
        if (typeof q.options === 'string') {
            try {
                options = JSON.parse(q.options);
            } catch(e) { options = []; }
        } else {
            options = q.options || [];
        }
        
        let correctIdx = Number(q.correctAnswerIndex) - 1;

        // Validation: Check bounds
        if (Number.isNaN(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
             console.warn(`Question ${currentQuestionIndex}: Invalid correctAnswerIndex ${q.correctAnswerIndex}.`);
             // Failsafe: if user answered, and we can't find correct, assume user was right to avoid RED only
             if (userAnswers[currentQuestionIndex] && userAnswers[currentQuestionIndex].isCorrect) {
                 correctIdx = userAnswers[currentQuestionIndex].selectedIdx;
             }
        }

        options.forEach((opt, idx) => {
            const btn = document.createElement('div');
            btn.className = 'answer-option';
            btn.dataset.idx = idx; // For event delegation
            
            const isAnswered = userAnswers[currentQuestionIndex] !== null;
            
            if (isAnswered) {
                btn.classList.add('disabled');
                
                const userSel = userAnswers[currentQuestionIndex].selectedIdx;
                const userCorrect = userAnswers[currentQuestionIndex].isCorrect;

                if (idx === correctIdx) {
                    btn.classList.add('correct');
                } 
                
                if (!userCorrect && idx === userSel) {
                     btn.classList.add('wrong');
                }
            }

            btn.innerHTML = `
                <div class="radio-circle"></div>
                <div class="answer-text">${opt}</div>
                <i class="status-icon fa-solid ${idx === correctIdx ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
            `;
            els.answersList.appendChild(btn);
        });

        if (userAnswers[currentQuestionIndex] !== null && els.nextBtn) {
            els.nextBtn.disabled = false;
        }
    }

    function checkAnswer(selectedIdx) {
        if (userAnswers[currentQuestionIndex] !== null) return; // Already answered

        const q = questions[currentQuestionIndex];
        let correctIdx = Number(q.correctAnswerIndex) - 1;
        
        // Validation
        let optionsCount = 0;
        if(els.answersList) optionsCount = els.answersList.children.length;
        
        let isDataInvalid = false;
        if (Number.isNaN(correctIdx) || correctIdx < 0 || correctIdx >= optionsCount) {
             console.warn(`Question ${currentQuestionIndex}: Invalid correctAnswerIndex ${q.correctAnswerIndex}. Defaulting to user selection.`);
             isDataInvalid = true;
        }

        const isCorrect = isDataInvalid ? true : (selectedIdx === correctIdx);
        
        if (isDataInvalid) {
            correctIdx = selectedIdx; 
        }

        userAnswers[currentQuestionIndex] = {
            selectedIdx: selectedIdx,
            isCorrect: isCorrect
        };

        // Update UI
        const options = els.answersList.children;
        
        // Highlight correct
        if (options[correctIdx]) {
            options[correctIdx].classList.add('correct');
        }
        
        // Highlight wrong if needed
        if (!isCorrect) {
            if (options[selectedIdx]) {
                options[selectedIdx].classList.add('wrong');
            }
        }

        // Disable all
        Array.from(options).forEach(opt => opt.classList.add('disabled'));

        // Enable Next
        if (els.nextBtn) els.nextBtn.disabled = false;

        // Update Nav Grid
        updateNavGrid();
    }

    function nextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            loadQuestion(currentQuestionIndex + 1);
        } else {
            // Check if all answered
            const allAnswered = userAnswers.every(ans => ans !== null);
            if (allAnswered) {
                finishTest();
            } else {
                // Find first unanswered
                const firstUnanswered = userAnswers.findIndex(ans => ans === null);
                if (firstUnanswered !== -1) {
                    showNotification('Խնդրում ենք պատասխանել բոլոր հարցերին ավարտելու համար:', 'warning');
                    loadQuestion(firstUnanswered);
                }
            }
        }
    }

    function finishTest(isTimeout = false) {
        clearInterval(timerInterval);
        
        const correct = userAnswers.filter(a => a && a.isCorrect).length;
        const wrong = userAnswers.filter(a => a && !a.isCorrect).length; 
        
        // Calculate time spent
        let timeText = '';
        if (isTimeout) {
            timeText = 'Ժամանակը սպառվեց';
        } else {
            const endTime = Date.now();
            const timeSpentSeconds = Math.floor((endTime - startTime) / 1000);
            const m = Math.floor(timeSpentSeconds / 60);
            const s = timeSpentSeconds % 60;
            timeText = `${m} րոպե ${s} վայրկյանում`;
        }

        // Calculate score
        const total = questions.length;
        const score = total > 0 ? Math.round((correct / total) * 100) : 0;

        if (els.correctCount) els.correctCount.innerText = correct;
        if (els.wrongCount) els.wrongCount.innerText = wrong;
        if (els.timeSpentBadge) els.timeSpentBadge.innerText = timeText;
        
        // Handle timeout badge color
        if (isTimeout && els.timeSpentBadge) {
            els.timeSpentBadge.classList.replace('bg-primary', 'bg-danger');
        }

        if (els.scorePercent) els.scorePercent.innerText = score;
        
        // Color circle based on score
        const circle = document.getElementById('scoreCircle');
        if(circle) {
            circle.className = 'score-circle mb-4'; 
            if (score >= 90) circle.classList.add('high');
            else if (score >= 50) circle.classList.add('medium');
            else circle.classList.add('low');
        }

        if (els.resultModal) els.resultModal.show();

        // Save result to server
        const resultData = {
            testId: testData.id,
            score: score,
            correct_count: correct,
            wrong_count: wrong,
            time_spent: isTimeout ? 30*60 : Math.floor((Date.now() - startTime) / 1000),
            status: score >= 90 ? 'passed' : 'failed'
        };

        fetch('/api/v1/tests/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        }).then(res => res.json())
          .then(data => {
              if (data.saved) {
                  // console.log('Result saved successfully');
              } else {
                  // console.log('Result not saved (user not logged in or error)');
                  // Optional: Show notification?
              }
          })
          .catch(err => {
              // console.error('Error saving result:', err);
              // showNotification('Արդյունքները պահպանելու սխալ', 'error');
          });
    }

    function renderNavGrid() {
        if (!els.navGrid) return;
        els.navGrid.innerHTML = '';
        questions.forEach((_, idx) => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.innerText = idx + 1;
            item.dataset.idx = idx;
            item.id = `nav-item-${idx}`;
            els.navGrid.appendChild(item);
        });
    }

    function updateNavGrid() {
        if (!els.navGrid) return;
        questions.forEach((_, idx) => {
            const item = document.getElementById(`nav-item-${idx}`);
            if (!item) return;
            // Reset
            item.className = 'nav-item'; 
            
            if (idx === currentQuestionIndex) {
                item.classList.add('current');
            }

            const ans = userAnswers[idx];
            if (ans) {
                item.classList.add(ans.isCorrect ? 'correct' : 'wrong');
            }
        });
    }

    function openImageModal() {
        if (els.imageModal) els.imageModal.show();
    }

    // Start
    init();
});
