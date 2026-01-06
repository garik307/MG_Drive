class Questions {
    constructor(object, containerSelector) {
        this.object = object;
        this.container = document.querySelector(containerSelector);
        this.correctAnswers = object.map(item => item.correctAnswerIndex);
        this.answeredQuestions = new Set();
        this.score = 0;
        this.resultBox = document.createElement('div');
        this.resultBox.id = 'resultBox';
        this.init();
    }

    generateAnswer(option, i, qIndex) {
        return `
            <li class="question_answer" data-question="${qIndex}" data-index="${i}">
              <span class="count">0${i + 1}</span> ${option}
            </li>`;
    }

    renderQuestionCard(item, index) {
        let answersHTML = '';
        let options = this.parseOptions(item.options);

        options.forEach((option, i) => {
            answersHTML += this.generateAnswer(option, i, index);
        });

        let i = index + 1;
        let image = {
            img: ''
        };
        console.log(item.files)

        if (item.files) {
            let foundImage = item.files.find(file => file.name_used === 'question_img');
            if (foundImage) {
                image = {
                    img: `/client/images/questions/large/${foundImage.name}.${foundImage.ext}`
                };
            } else {
                image = {
                    img: `/client/images/404.jpg`
                };
            }
        }

        return `
            <div class="questionCard">
              <div class="badge">${i < 10 ? "0" + i : i}</div>
              <div class="image" id="lightgallery">
                <a href="${image.img}" class="gallery_item scroll_animate">
                    <img src="${image.img}" />
                </a>
              </div>
              <div class="card_body">
                <h3 class="title">${item.question}</h3>
                <ul class="question_answers">${answersHTML}</ul>
              </div>
            </div>`;
    }

    parseOptions(options) {
        try {
            if (typeof options === "string") {
                return JSON.parse(options);
            }
            return options;
        } catch (e) {
            console.warn("Invalid options JSON:", options);
            return [];
        }
    }

    renderQuestions() {
        this.container.innerHTML = ""; // reset before rendering
        this.object.forEach((item, index) => {
            this.container.innerHTML += this.renderQuestionCard(item, index);
        });

        if (this.container) this.container.appendChild(this.resultBox);
    }

    handleClicks() {
        const allAnswers = document.querySelectorAll('.question_answer');

        allAnswers.forEach(answer => {
            answer.addEventListener('click', () => {
                const qIndex = parseInt(answer.dataset.question);
                const selected = parseInt(answer.dataset.index);
                const correct = this.correctAnswers[qIndex];

                const allInQuestion = answer.parentElement.querySelectorAll('.question_answer');
                if (this.answeredQuestions.has(qIndex)) return;

                allInQuestion.forEach((ans, i) => {
                    ans.style.pointerEvents = 'none';

                    if (i === correct) {
                        ans.style.backgroundColor = '#d4edda';
                        ans.style.color = '#155724';
                    }

                    if (i === selected && selected !== correct) {
                        ans.style.backgroundColor = '#f8d7da';
                        ans.style.color = '#721c24';
                    }
                });

                this.answeredQuestions.add(qIndex);
                if (selected === correct) this.score++;

                if (this.answeredQuestions.size === this.object.length) {
                    this.resultBox.innerHTML = `
                        <div class="result">
                          <i class="fa-solid fa-circle-check" style="font-size: 20px; color: #00DE3B"></i> 
                          Դու պատասխանել ես ${this.object.length}-ից <strong>${this.score}</strong> ճիշտ հարցի։
                        </div>`;
                }
            });
        });
    }

    init() {
        if (!this.container) return;
        this.renderQuestions();
        this.handleClicks();
    }
}

// ==========================
const selectQuestionTest = document.querySelector('#select_tests');
const selectQuestionGroup = document.querySelector('#select_groups');

(async function () {
    if (selectQuestionTest) {
        const tests = await doAxios(`/api/v1/tests`);
        tests.data.tests.forEach(test => {
            selectQuestionTest.innerHTML += `<option value="${test.id}">${test.title}-${test.number}</option>`;
        });
    }

    if (selectQuestionGroup) {
        const groups = await doAxios(`/api/v1/groups`);
        groups.data.groups.forEach(group => {
            selectQuestionGroup.innerHTML += `<option value="${group.id}">${group.slug}</option>`;
        });
    }
})();

// event handler
async function handleSelectChange(e) {
    const selectedValue = e.target.value;
    const selectedName = e.target.name;

    if (selectedName === 'selected_test') {
        if (selectedValue === '*') {
            new Questions([], '.tests_page .question_card');
            return;
        }
        const test = await doAxios(`/api/v1/tests/${selectedValue}`);
        console.log(test)
        new Questions(test.data.tests.questions, '.tests_page .question_card');
    } else if (selectedName === 'selected_groups') {

        if (selectedValue === '*') {
            new Questions([], '.groups_page .question_card');
            return;
        }
        const group = await doAxios(`/api/v1/groups/${selectedValue}`);
        new Questions(group.data.group.questions, '.groups_page .question_card');
    }
}

// Event listeners
if (selectQuestionTest) {
    selectQuestionTest.addEventListener('change', handleSelectChange);
}
if (selectQuestionGroup) {
    selectQuestionGroup.addEventListener('change', handleSelectChange);
}