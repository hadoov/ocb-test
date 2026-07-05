const REQUIRED_PARTS = [
  "Part 1 - Australia and its people",
  "Part 2 - Australia’s democratic beliefs, rights and liberties",
  "Part 3 - Government and the law in Australia",
  "Part 4 - Australian values",
];

const VALUES_PART = "Part 4 - Australian values";
const QUESTIONS_PER_PART = 5;
const REMOTE_BANK_URL = "https://hadoov.github.io/ocb-test/bank.json";

const state = {
  bank: [],
  questions: [],
  answers: new Map(),
  currentIndex: 0,
};

const startScreen = document.querySelector("#start-screen");
const testScreen = document.querySelector("#test-screen");
const resultsScreen = document.querySelector("#results-screen");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const submitButton = document.querySelector("#submit-button");
const previousButton = document.querySelector("#previous-button");
const nextButton = document.querySelector("#next-button");
const testForm = document.querySelector("#test-form");
const answeredCount = document.querySelector("#answered-count");
const submitWarning = document.querySelector("#submit-warning");
const resultBanner = document.querySelector("#result-banner");
const scoreSummary = document.querySelector("#score-summary");
const partResults = document.querySelector("#part-results");
const reviewList = document.querySelector("#review-list");
const startError = document.querySelector("#start-error");

async function loadBank() {
  const bankUrls = ["bank.json", REMOTE_BANK_URL];
  let loadError = null;

  for (const bankUrl of bankUrls) {
    try {
      const response = await fetch(bankUrl, { cache: "no-cache" });

      if (!response.ok) {
        throw new Error(`Could not load ${bankUrl}.`);
      }

      state.bank = await response.json();
      return;
    } catch (error) {
      loadError = error;
    }
  }

  throw loadError ?? new Error("Could not load the question bank.");
}

function getBankErrorMessage() {
  if (window.location.protocol === "file:") {
    return "Could not load the question bank from this file. Open the app from GitHub Pages or a local web server, then try again.";
  }

  return "Could not load the question bank. Check that bank.json is available beside index.html, then refresh.";
}

function shuffle(items) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function selectQuestions() {
  const selected = REQUIRED_PARTS.flatMap((part) => {
    const questionsForPart = state.bank.filter((question) => question.part === part);
    return shuffle(questionsForPart).slice(0, QUESTIONS_PER_PART);
  });

  state.questions = shuffle(selected);
  state.answers = new Map();
  state.currentIndex = 0;
}

function setScreen(activeScreen) {
  [startScreen, testScreen, resultsScreen].forEach((screen) => {
    screen.classList.toggle("hidden", screen !== activeScreen);
  });
}

function renderQuestion(question, index) {
  const options = Object.entries(question.options)
    .map(([key, value]) => {
      const inputId = `question-${question.id}-${key}`;
      const isChecked = state.answers.get(question.id) === key ? "checked" : "";
      return `
        <label class="option" for="${inputId}">
          <input id="${inputId}" type="radio" name="question-${question.id}" value="${key}" ${isChecked} required>
          <span>${key}. ${value}</span>
        </label>
      `;
    })
    .join("");

  return `
    <article class="question-card" data-question-id="${question.id}">
      <div class="question-top">
        <span class="question-number">${index + 1}</span>
        <div>
          <p class="question-count">Question ${index + 1} of ${state.questions.length}</p>
          <p class="question-text">${question.question}</p>
        </div>
      </div>
      <div class="options">${options}</div>
    </article>
  `;
}

function renderTest() {
  const currentQuestion = state.questions[state.currentIndex];

  testForm.innerHTML = renderQuestion(currentQuestion, state.currentIndex);
  updateNavigation();
  submitWarning.classList.add("hidden");
  setScreen(testScreen);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateNavigation() {
  const currentQuestion = state.questions[state.currentIndex];
  const isLastQuestion = state.currentIndex === state.questions.length - 1;

  answeredCount.textContent = String(state.answers.size);
  previousButton.disabled = state.currentIndex === 0;
  nextButton.disabled = !state.answers.has(currentQuestion.id);
  nextButton.classList.toggle("hidden", isLastQuestion);
  submitButton.classList.toggle("hidden", !isLastQuestion);
  submitWarning.classList.add("hidden");
}

function goToQuestion(index) {
  state.currentIndex = Math.min(Math.max(index, 0), state.questions.length - 1);
  renderTest();
}

function calculateResult() {
  const byPart = REQUIRED_PARTS.map((part) => {
    const questions = state.questions.filter((question) => question.part === part);
    const correct = questions.filter((question) => state.answers.get(question.id) === question.answer).length;
    return { part, correct, total: questions.length };
  });

  const totalCorrect = byPart.reduce((sum, part) => sum + part.correct, 0);
  const totalQuestions = state.questions.length;
  const percentage = Math.round((totalCorrect / totalQuestions) * 100);
  const valuesResult = byPart.find((part) => part.part === VALUES_PART);
  const valuesPassed = valuesResult.correct === valuesResult.total;
  const overallPassed = percentage >= 75;

  return {
    byPart,
    totalCorrect,
    totalQuestions,
    percentage,
    valuesPassed,
    overallPassed,
    passed: valuesPassed && overallPassed,
  };
}

function renderScoreTile(label, value) {
  return `
    <div class="score-tile">
      <p class="score-label">${label}</p>
      <p class="score-value">${value}</p>
    </div>
  `;
}

function renderResults(result) {
  resultBanner.className = `result-banner ${result.passed ? "pass" : "fail"}`;
  resultBanner.textContent = result.passed ? "Passed" : "Not passed";

  scoreSummary.innerHTML = [
    renderScoreTile("Overall score", `${result.totalCorrect}/${result.totalQuestions}`),
    renderScoreTile("Percentage", `${result.percentage}%`),
    renderScoreTile("Australian values", result.valuesPassed ? "5/5" : `${result.byPart.find((part) => part.part === VALUES_PART).correct}/5`),
  ].join("");

  partResults.innerHTML = result.byPart
    .map((part) => {
      return `
        <div class="part-row">
          <p class="part-name">${part.part}</p>
          <span class="part-score">${part.correct}/${part.total}</span>
        </div>
      `;
    })
    .join("");

  reviewList.innerHTML = state.questions
    .map((question, index) => {
      const selectedAnswer = state.answers.get(question.id);
      const selectedText = question.options[selectedAnswer];
      const correctText = question.options[question.answer];
      const isCorrect = selectedAnswer === question.answer;

      return `
        <article class="review-card ${isCorrect ? "correct" : "incorrect"}">
          <div class="review-meta" aria-label="Question review details">
            <span class="review-pill">Question ${index + 1}</span>
            <span class="review-pill">${question.part}</span>
            <span class="review-pill ${isCorrect ? "success" : "danger"}">${isCorrect ? "Correct" : "Incorrect"}</span>
          </div>
          <p><strong>${question.question}</strong></p>
          <p class="review-answer">Your answer: ${selectedAnswer}. ${selectedText}</p>
          ${isCorrect ? "" : `<p class="review-answer">Correct answer: ${question.answer}. ${correctText}</p>`}
        </article>
      `;
    })
    .join("");

  setScreen(resultsScreen);
  window.scrollTo({ top: 0, behavior: "instant" });
}

async function startTest() {
  startButton.disabled = true;
  startButton.textContent = "Loading...";
  startError.classList.add("hidden");

  try {
    if (state.bank.length === 0) {
      await loadBank();
    }

    selectQuestions();
    renderTest();
  } catch (error) {
    startError.textContent = getBankErrorMessage();
    startError.classList.remove("hidden");
    console.error(error);
  } finally {
    startButton.disabled = false;
    startButton.textContent = "Start test";
  }
}

testForm.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement && event.target.type === "radio") {
    const card = event.target.closest("[data-question-id]");
    state.answers.set(Number(card.dataset.questionId), event.target.value);
    updateNavigation();
  }
});

previousButton.addEventListener("click", () => {
  goToQuestion(state.currentIndex - 1);
});

nextButton.addEventListener("click", () => {
  goToQuestion(state.currentIndex + 1);
});

submitButton.addEventListener("click", () => {
  if (state.answers.size !== state.questions.length) {
    submitWarning.classList.remove("hidden");
    return;
  }

  renderResults(calculateResult());
});

startButton.addEventListener("click", startTest);
restartButton.addEventListener("click", startTest);
