let currentQuizType = ""; // "theme" или "exam"
let currentThemeName = "";
let quizQuestions = [];
let userAnswers = {}; // Хранилище вида { индекс_вопроса: ответ }
let currentQuestionIndex = 0;
const THEMES = Array.from(new Set(singleChoiceQuestions.map(q => q.theme)));

document.addEventListener("DOMContentLoaded", () => {
    renderThemesGrid();
});

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

// Рендер выбора тем
function renderThemesGrid() {
    const grid = document.getElementById("themes-grid");
    grid.innerHTML = "";
    THEMES.forEach(theme => {
        const card = document.createElement("div");
        card.className = "theme-card";
        card.innerText = theme;
        card.onclick = () => startThemeQuiz(theme);
        grid.appendChild(card);
    });
}

// Вспомогательная функция перемешивания массива (Fisher-Yates)
function shuffle(array) {
    const result = array.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// Группируем ситуационные вопросы по теме, сохраняя подряд идущие блоки (по одному изображению/теме)
function groupSituationalQuestions() {
    const groups = {};
    situationalQuestions.forEach(q => {
        const key = q.image || q.id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(q);
    });
    return Object.values(groups).map(group => group.sort((a, b) => a.id - b.id));
}

// ЗАПУСК: Тест по теме (10 случайных вопросов)
function startThemeQuiz(themeName) {
    currentQuizType = "theme";
    currentThemeName = themeName;
    
    // Фильтруем вопросы по теме
    const filtered = singleChoiceQuestions.filter(q => q.theme === themeName);
    
    if(filtered.length === 0) {
        alert("В этой теме пока нет вопросов. Добавьте их в questions.js!");
        return;
    }
    
    // Берем максимум 10 штук случайных
    quizQuestions = shuffle([...filtered]).slice(0, 10);
    initQuiz();
}

// ЗАПУСК: Пробный ЕНТ (50 вопросов)
function startFullExam() {
    currentQuizType = "exam";
    
    // 1. 1-20: Одиночные (случайные из всей базы)
    const part1 = shuffle([...singleChoiceQuestions]).slice(0, 20);
    
    // 2. 21-40: Множественный выбор
    const part2 = shuffle([...multipleChoiceQuestions]).slice(0, 20);
    
    // 3. 41-50: Ситуационные — 2 темы по 5 подряд взятых вопросов
    const situationalGroups = shuffle(groupSituationalQuestions()).filter(group => group.length >= 5);
    const part3 = situationalGroups.length >= 2
        ? situationalGroups.slice(0, 2).flatMap(group => group.slice(0, 5))
        : shuffle([...situationalQuestions]).slice(0, 10);
    
    quizQuestions = [...part1, ...part2, ...part3];
    
    if(quizQuestions.length < 50) {
         alert(`Внимание! В базе недостаточно вопросов для полного ЕНТ (Всего собрано: ${quizQuestions.length}/50). Добавьте вопросы в базу.`);
    }
    
    initQuiz();
}

// Инициализация интерфейса теста
function initQuiz() {
    userAnswers = {};
    currentQuestionIndex = 0;
    renderNavigation();
    loadQuestion(0);
    showScreen("screen-quiz");
    
    // Показываем кнопку окончания теста, если это ЕНТ или длинный тест
    document.getElementById("btn-finish-quiz").classList.remove("hidden");
}

// Навигационная панель (свободный выбор вопросов)
function renderNavigation() {
    const nav = document.getElementById("quiz-navigation");
    nav.innerHTML = "";
    
    quizQuestions.forEach((_, index) => {
        const btn = document.createElement("button");
        btn.className = "nav-btn";
        btn.innerText = index + 1;
        btn.id = `nav-btn-${index}`;
        
        if(index === currentQuestionIndex) btn.classList.add("active");
        if(userAnswers[index] !== undefined) btn.classList.add("answered");
        
        btn.onclick = () => {
            saveCurrentState();
            currentQuestionIndex = index;
            updateNavActiveHighlight();
            loadQuestion(index);
        };
        nav.appendChild(btn);
    });
}

function updateNavActiveHighlight() {
    document.querySelectorAll(".nav-btn").forEach((btn, idx) => {
        btn.classList.remove("active");
        if(idx === currentQuestionIndex) btn.classList.add("active");
    });
}

// Загрузка вопроса на экран
function loadQuestion(index) {
    const q = quizQuestions[index];
    const meta = document.getElementById("question-meta");
    const text = document.getElementById("question-text");
    const imgContainer = document.getElementById("situational-container");
    const img = document.getElementById("situational-image");
    const answersContainer = document.getElementById("answers-container");
    const multipleBtn = document.getElementById("btn-submit-multiple");

    // Заголовок типа вопроса
    let qType = "Одиночный выбор";
    if (q.image) qType = "Ситуационный вопрос";
    else if (Array.isArray(q.correct)) qType = "Несколько правильных ответов";

    meta.innerText = `Вопрос ${index + 1} из ${quizQuestions.length} [${qType}]`;
    text.innerText = q.text;
    answersContainer.innerHTML = "";

    // Обработка картинок
    if(q.image) {
        img.src = q.image;
        imgContainer.classList.remove("hidden");
    } else {
        imgContainer.classList.add("hidden");
    }

    // Рендер вариантов
    if(Array.isArray(q.correct)) {
        // Множественный выбор (Чекбоксы)
        multipleBtn.classList.remove("hidden");
        const savedAns = userAnswers[index] || [];
        
        q.options.forEach(opt => {
            const label = document.createElement("label");
            label.className = "option-label";
            if(savedAns.includes(opt)) label.classList.add("selected");

            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.value = opt;
            chk.checked = savedAns.includes(opt);
            chk.onchange = () => label.classList.toggle("selected", chk.checked);

            label.appendChild(chk);
            label.appendChild(document.createTextNode(opt));
            answersContainer.appendChild(label);
        });
    } else {
        // Одиночный выбор (Радиокнопки)
        multipleBtn.classList.add("hidden");
        const savedAns = userAnswers[index] || "";

        q.options.forEach(opt => {
            const label = document.createElement("label");
            label.className = "option-label";
            if(savedAns === opt) label.classList.add("selected");

            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "quiz-opt";
            radio.value = opt;
            radio.checked = (savedAns === opt);
            
            radio.onchange = () => {
                document.querySelectorAll(".option-label").forEach(l => l.classList.remove("selected"));
                label.classList.add("selected");
                // Сохраняем сразу для одиночного
                userAnswers[currentQuestionIndex] = opt;
                markNavAnswered(currentQuestionIndex);
            };

            label.appendChild(radio);
        label.appendChild(document.createTextNode(opt));
        answersContainer.appendChild(label);
        });
    }

    const nextBtn = document.getElementById("btn-next-question");
    nextBtn.classList.toggle("hidden", index >= quizQuestions.length - 1);
}

function goToNextQuestion() {
    saveCurrentState();
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        updateNavActiveHighlight();
        loadQuestion(currentQuestionIndex);
    }
}

// Сохранение ответов с множественным выбором по кнопке
function saveMultipleAnswer() {
    const checkedBoxes = document.querySelectorAll("#answers-container input[type='checkbox']:checked");
    const answers = Array.from(checkedBoxes).map(cb => cb.value);
    
    userAnswers[currentQuestionIndex] = answers;
    if(answers.length > 0) {
        markNavAnswered(currentQuestionIndex);
    }
}

function saveCurrentState() {
    // Автосохранение множественного выбора при переходе кликом на другой вопрос
    const chks = document.querySelectorAll("#answers-container input[type='checkbox']");
    if(chks.length > 0) {
        saveMultipleAnswer();
    }
}

function markNavAnswered(index) {
    const btn = document.getElementById(`nav-btn-${index}`);
    if(btn) btn.classList.add("answered");
}

function confirmExit() {
    if(confirm("Вы уверены, что хотите прервать тестирование? Прогресс будет потерян.")) {
        showScreen("screen-main");
    }
}

// Расчет результатов согласно правилам ЕНТ
function finishQuiz() {
    saveCurrentState(); // Убеждаемся, что последний вопрос сохранен
    
    let totalScore = 0;
    let maxScore = 0;

    quizQuestions.forEach((q, index) => {
        const userAns = userAnswers[index];

        if(Array.isArray(q.correct)) {
            // ЕНТ логика для множественного выбора (макс 2 балла)
            // Полное совпадение = 2 балла, 1 ошибка = 1 балл, более 1 ошибки = 0 баллов
            maxScore += 2;
            if(!userAns) return;

            const correctSet = new Set(q.correct);
            const userSet = new Set(userAns);

            let mistakes = 0;
            // Проверяем лишние выбранные
            userAns.forEach(a => { if(!correctSet.has(a)) mistakes++; });
            // Проверяем невыбранные правильные
            q.correct.forEach(a => { if(!userSet.has(a)) mistakes++; });

            if (mistakes === 0) totalScore += 2;
            else if (mistakes === 1) totalScore += 1;
        } else {
            // Одиночный выбор (1 балл)
            maxScore += 1;
            if(userAns === q.correct) {
                totalScore += 1;
            }
        }
    });

    // Вывод результатов
    document.getElementById("res-score").innerText = `${totalScore}/${maxScore}`;
    const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    document.getElementById("res-percent").innerText = `Процент верных ответов: ${percent}%`;
    
    let evaluation = "";
    if(percent >= 85) evaluation = "Отличный результат! Вы полностью готовы к ЕНТ.";
    else if(percent >= 65) evaluation = "Хороший уровень, но стоит подтянуть слабые темы.";
    else evaluation = "Рекомендуется уделить больше времени изучению исторического материала.";
    
    document.getElementById("res-detailed").innerText = evaluation;
    
    showScreen("screen-results");
}

function renderAllResults() {
    const container = document.getElementById("all-results-list");
    container.innerHTML = "";

    quizQuestions.forEach((q, index) => {
        const userAns = userAnswers[index];
        const isMultiple = Array.isArray(q.correct);
        const correctText = isMultiple ? q.correct.join(", ") : q.correct;
        let status = "Не отвечено";
        let answerText = "";

        if (userAns !== undefined) {
            if (isMultiple) {
                const correctSet = new Set(q.correct);
                const userSet = new Set(userAns);
                const missed = q.correct.filter(ans => !userSet.has(ans)).length;
                const extra = userAns.filter(ans => !correctSet.has(ans)).length;
                const mistakes = missed + extra;

                if (mistakes === 0) {
                    status = "Верно";
                } else if (mistakes === 1) {
                    status = "Частично верно";
                } else {
                    status = "Неверно";
                }
                answerText = userAns.join(", ");
            } else {
                status = userAns === q.correct ? "Верно" : "Неверно";
                answerText = userAns;
            }
        }

        const item = document.createElement("div");
        item.className = "result-item";
        item.innerHTML = `
            <div class="result-item-header">
                <span class="result-item-number">${index + 1}.</span>
                <span class="result-item-status ${status === 'Верно' ? 'correct' : status === 'Частично верно' ? 'partial' : 'wrong'}">${status}</span>
            </div>
            <div class="result-question">${q.text}</div>
            <div class="result-answer"><strong>Правильный ответ:</strong> ${correctText}</div>
            ${answerText ? `<div class="result-answer"><strong>Ваш ответ:</strong> ${answerText}</div>` : ""}
        `;

        container.appendChild(item);
    });
}