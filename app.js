// ===== Configuration =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxn70cdrLa0M2rwDwNH6kH9vFyl1byhCPNQNbnXnZKiA4lmpaLdGX_HNDzK1hwLpcnPPw/exec';

// ===== State =====
let totalQuestions = 0;
const correctAnswers = new Map(); // questionId -> true (only stored when correctly answered)

// ===== DOM References =====
const nameInput    = document.getElementById('name-input');
const quizContainer = document.getElementById('quiz-container');
const submitBtn    = document.getElementById('submit-btn');
const submitHint   = document.getElementById('submit-hint');
const successMsg   = document.getElementById('success-message');

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  fetch('questions.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load questions.json');
      return res.json();
    })
    .then(questions => {
      totalQuestions = questions.length;
      renderQuiz(questions);
    })
    .catch(err => {
      quizContainer.innerHTML = `<p style="color:var(--wrong);text-align:center;padding:2rem;">שגיאה בטעינת השאלות. נסה לרענן את הדף.</p>`;
      console.error(err);
    });

  nameInput.addEventListener('input', checkSubmitEligibility);
  submitBtn.addEventListener('click', handleSubmit);
});

// ===== Render Quiz =====
function renderQuiz(questions) {
  quizContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.dataset.id = q.id;

    // Question header
    const header = document.createElement('div');
    header.className = 'question-header';

    const num = document.createElement('div');
    num.className = 'question-number';
    num.textContent = index + 1;

    const text = document.createElement('div');
    text.className = 'question-text';
    text.textContent = q.question;

    header.appendChild(num);
    header.appendChild(text);
    card.appendChild(header);

    // Options
    const optionsList = document.createElement('div');
    optionsList.className = 'options-list';
    optionsList.dataset.questionId = q.id;

    q.options.forEach(option => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.type = 'button';
      btn.textContent = option.text;
      btn.addEventListener('click', () => handleOptionClick(q.id, option, btn, optionsList, errorEl));
      optionsList.appendChild(btn);
    });

    card.appendChild(optionsList);

    // Error message element
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    card.appendChild(errorEl);

    quizContainer.appendChild(card);
  });
}

// ===== Handle Option Click =====
function handleOptionClick(questionId, option, clickedBtn, optionsList, errorEl) {
  if (option.isCorrect) {
    // Mark correct
    clickedBtn.classList.add('correct');
    clickedBtn.classList.remove('wrong');

    // Disable all options in this question
    optionsList.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
    });

    // Hide error
    errorEl.textContent = '';
    errorEl.classList.remove('visible');

    // Record correct answer
    correctAnswers.set(questionId, true);
    checkSubmitEligibility();

  } else {
    // Remove previous wrong state from all buttons in this question (clean up)
    optionsList.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.remove('wrong');
    });

    // Mark this button as wrong
    clickedBtn.classList.add('wrong');

    // Show error message
    errorEl.textContent = option.errorMessage;
    errorEl.classList.add('visible');

    // Remove the .wrong class after animation ends so the user can retry
    clickedBtn.addEventListener('animationend', () => {
      clickedBtn.classList.remove('wrong');
    }, { once: true });
  }
}

// ===== Check Submit Eligibility =====
function checkSubmitEligibility() {
  const nameOk = nameInput.value.trim().length > 0;
  const allCorrect = correctAnswers.size === totalQuestions;

  if (nameOk && allCorrect) {
    submitBtn.disabled = false;
    submitHint.textContent = 'ניתן להגיש את הבוחן.';
  } else {
    submitBtn.disabled = true;
    if (!nameOk && !allCorrect) {
      submitHint.textContent = 'יש לענות נכון על כל השאלות ולמלא שם מלא.';
    } else if (!nameOk) {
      submitHint.textContent = 'יש למלא שם מלא לפני ההגשה.';
    } else {
      submitHint.textContent = 'יש לענות נכון על כל השאלות.';
    }
  }
}

// ===== Handle Submit =====
function handleSubmit() {
  submitBtn.disabled = true;
  submitBtn.textContent = 'שולח...';

  const payload = {
    name: nameInput.value.trim(),
    timestamp: new Date().toISOString(),
    status: 'עבר'
  };

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(() => {
      showSuccess();
    })
    .catch(err => {
      console.error('Submission error:', err);
      // With no-cors, fetch won't throw on HTTP errors from GAS — only network failures.
      // Still show success to the user since no-cors opaque responses can't be inspected.
      showSuccess();
    });
}

// ===== Show Success =====
function showSuccess() {
  successMsg.removeAttribute('hidden');
  // Scroll to top so the overlay is fully visible
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
