const REQUIRED_PARTS = [
  "Part 1 - Australia and its people",
  "Part 2 - Australia’s democratic beliefs, rights and liberties",
  "Part 3 - Government and the law in Australia",
  "Part 4 - Australian values",
];

const VALUES_PART = "Part 4 - Australian values";
const QUESTIONS_PER_PART = 5;

const state = {
  bank: [],
  questions: [],
  answers: new Map(),
};

const startScreen = document.querySelector("#start-screen");
const testScreen = document.querySelector("#test-screen");
const resultsScreen = document.querySelector("#results-screen");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const submitButton = document.querySelector("#submit-button");
const testForm = document.querySelector("#test-form");
const answeredCount = document.querySelector("#answered-count");
const submitWarning = document.querySelector("#submit-warning");
const resultBanner = document.querySelector("#result-banner");
const scoreSummary = document.querySelector("#score-summary");
const partResults = document.querySelector("#part-results");
const reviewList = document.querySelector("#review-list");

async function loadBank() {
  const response = await fetch("bank.json");

  if (!response.ok) {
    throw new Error("Could not load the question bank.");
  }

  state.bank = await response.json();
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
      return `
        <label class="option" for="${inputId}">
          <input id="${inputId}" type="radio" name="question-${question.id}" value="${key}" required>
          <span>${key}. ${value}</span>
        </label>
      `;
    })
    .join("");

  return `
    <article class="question-card" data-question-id="${question.id}">
      <div class="question-top">
        <span class="question-number">${index + 1}</span>
        <p class="question-text">${question.question}</p>
      </div>
      <div class="options">${options}</div>
    </article>
  `;
}

function renderTest() {
  testForm.innerHTML = state.questions.map(renderQuestion).join("");
  answeredCount.textContent = "0";
  submitWarning.classList.add("hidden");
  setScreen(testScreen);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function updateAnsweredCount() {
  answeredCount.textContent = String(state.answers.size);
  submitWarning.classList.add("hidden");
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
          <p class="review-meta">Question ${index + 1} · ${isCorrect ? "Correct" : "Incorrect"}</p>
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

  try {
    if (state.bank.length === 0) {
      await loadBank();
    }

    selectQuestions();
    renderTest();
  } catch (error) {
    startButton.textContent = "Could not load test";
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
    updateAnsweredCount();
  }
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
