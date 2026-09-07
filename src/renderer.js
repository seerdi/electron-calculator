// DOM Elements
const resultDisplay = document.getElementById('result-display');
const expressionDisplay = document.getElementById('expression-display');
const scientificPad = document.getElementById('scientific-pad');
const btnModeStd = document.getElementById('btn-mode-std');
const btnModeSci = document.getElementById('btn-mode-sci');
const btnHistoryToggle = document.getElementById('btn-history-toggle');
const historyDrawer = document.getElementById('history-drawer');
const historyList = document.getElementById('history-list');
const btnClearHistory = document.getElementById('btn-clear-history');
const btnCopy = document.getElementById('btn-copy');
const toast = document.getElementById('toast');

// Calculator State
let currentInput = '0';
let previousInput = null;
let currentOperator = null;
let shouldResetScreen = false;
let history = [];

// Load history from localStorage
try {
  const saved = localStorage.getItem('calc_history');
  if (saved) {
    history = JSON.parse(saved);
    renderHistory();
  }
} catch (e) {
  console.error('Failed to load history:', e);
}

// Adjust font size dynamically based on length
function updateDisplay() {
  resultDisplay.textContent = currentInput;
  const len = currentInput.length;
  if (len > 14) {
    resultDisplay.style.fontSize = '24px';
  } else if (len > 9) {
    resultDisplay.style.fontSize = '32px';
  } else {
    resultDisplay.style.fontSize = '42px';
  }
}

// Format numbers nicely to avoid floating point precision errors
function formatNumber(num) {
  if (isNaN(num) || !isFinite(num)) {
    return 'Error';
  }
  // Trim precision artifacts like 0.30000000000000004
  const rounded = parseFloat(Number(num).toPrecision(12));
  return String(rounded);
}

// Append digit
function appendNumber(num) {
  if (currentInput === '0' || shouldResetScreen) {
    currentInput = num;
    shouldResetScreen = false;
  } else {
    if (currentInput.length < 18) {
      currentInput += num;
    }
  }
  updateDisplay();
}

// Add decimal
function appendDecimal() {
  if (shouldResetScreen) {
    currentInput = '0.';
    shouldResetScreen = false;
  } else if (!currentInput.includes('.')) {
    currentInput += '.';
  }
  updateDisplay();
}

// Negate +/-
function toggleSign() {
  if (currentInput === '0' || currentInput === 'Error') return;
  if (currentInput.startsWith('-')) {
    currentInput = currentInput.slice(1);
  } else {
    currentInput = '-' + currentInput;
  }
  updateDisplay();
}

// Backspace
function backspace() {
  if (shouldResetScreen || currentInput === 'Error') {
    currentInput = '0';
    shouldResetScreen = false;
  } else {
    currentInput = currentInput.slice(0, -1);
    if (currentInput === '' || currentInput === '-') {
      currentInput = '0';
    }
  }
  updateDisplay();
}

// Clear functions
function clearEntry() {
  currentInput = '0';
  updateDisplay();
}

function allClear() {
  currentInput = '0';
  previousInput = null;
  currentOperator = null;
  shouldResetScreen = false;
  expressionDisplay.textContent = '';
  updateDisplay();
}

// Perform binary arithmetic
function compute() {
  if (!currentOperator || previousInput === null) return;

  const prev = parseFloat(previousInput);
  const current = parseFloat(currentInput);
  let result = 0;

  switch (currentOperator) {
    case '+':
      result = prev + current;
      break;
    case '−':
    case '-':
      result = prev - current;
      break;
    case '×':
    case '*':
      result = prev * current;
      break;
    case '÷':
    case '/':
      if (current === 0) {
        currentInput = 'Error';
        expressionDisplay.textContent = `${previousInput} ÷ 0 =`;
        updateDisplay();
        shouldResetScreen = true;
        return;
      }
      result = prev / current;
      break;
    case '^':
      result = Math.pow(prev, current);
      break;
    default:
      return;
  }

  const formattedResult = formatNumber(result);
  const expr = `${previousInput} ${currentOperator} ${currentInput} =`;

  addHistory(expr, formattedResult);

  expressionDisplay.textContent = expr;
  currentInput = formattedResult;
  previousInput = null;
  currentOperator = null;
  shouldResetScreen = true;
  updateDisplay();
}

// Choose an operator
function chooseOperator(op) {
  if (currentInput === 'Error') return;

  if (currentOperator !== null && !shouldResetScreen) {
    compute();
  }

  previousInput = currentInput;
  currentOperator = op;
  expressionDisplay.textContent = `${previousInput} ${currentOperator}`;
  shouldResetScreen = true;
}

// Scientific Single-Operand Functions
function applyScientific(func) {
  if (currentInput === 'Error') return;
  const val = parseFloat(currentInput);
  let res = 0;
  let expr = '';

  switch (func) {
    case 'sin':
      // Degrees
      res = Math.sin((val * Math.PI) / 180);
      expr = `sin(${val}°)`;
      break;
    case 'cos':
      // Degrees
      res = Math.cos((val * Math.PI) / 180);
      expr = `cos(${val}°)`;
      break;
    case 'tan':
      // Degrees
      if (Math.abs(val % 180) === 90) {
        res = NaN;
      } else {
        res = Math.tan((val * Math.PI) / 180);
      }
      expr = `tan(${val}°)`;
      break;
    case 'sqrt':
      if (val < 0) {
        res = NaN;
      } else {
        res = Math.sqrt(val);
      }
      expr = `√(${val})`;
      break;
    case 'square':
      res = Math.pow(val, 2);
      expr = `sqr(${val})`;
      break;
    case 'log':
      if (val <= 0) res = NaN;
      else res = Math.log10(val);
      expr = `log(${val})`;
      break;
    case 'ln':
      if (val <= 0) res = NaN;
      else res = Math.log(val);
      expr = `ln(${val})`;
      break;
    case 'pi':
      res = Math.PI;
      expr = 'π';
      break;
    case 'e':
      res = Math.E;
      expr = 'e';
      break;
    case 'reciprocal':
      if (val === 0) res = NaN;
      else res = 1 / val;
      expr = `1/(${val})`;
      break;
    case 'percent':
      res = val / 100;
      expr = `${val}%`;
      break;
    case 'power':
      chooseOperator('^');
      return;
    default:
      return;
  }

  const formatted = formatNumber(res);
  expressionDisplay.textContent = `${expr} =`;
  addHistory(expr, formatted);
  currentInput = formatted;
  shouldResetScreen = true;
  updateDisplay();
}

// History Management
function addHistory(expr, val) {
  if (val === 'Error') return;
  history.unshift({ expression: expr, result: val, id: Date.now() });
  if (history.length > 30) history.pop();
  try {
    localStorage.setItem('calc_history', JSON.stringify(history));
  } catch (e) {}
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="history-expr">${item.expression}</div>
      <div class="history-val">${item.result}</div>
    `;
    div.addEventListener('click', () => {
      currentInput = item.result;
      expressionDisplay.textContent = item.expression;
      shouldResetScreen = true;
      updateDisplay();
      historyDrawer.classList.remove('open');
    });
    historyList.appendChild(div);
  });
}

function showToast(msg = 'Copied to clipboard!') {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

// Copy result to clipboard
async function copyResult() {
  if (currentInput === 'Error') return;
  try {
    if (window.electronAPI && window.electronAPI.copyToClipboard) {
      await window.electronAPI.copyToClipboard(currentInput);
    } else {
      await navigator.clipboard.writeText(currentInput);
    }
    showToast('Copied: ' + currentInput);
  } catch (err) {
    console.error('Copy failed:', err);
  }
}

// Event Listeners for UI buttons
document.querySelectorAll('.key').forEach(button => {
  button.addEventListener('click', () => {
    const number = button.dataset.number;
    const action = button.dataset.action;
    const op = button.dataset.op;

    if (number !== undefined) {
      appendNumber(number);
      return;
    }

    if (op) {
      chooseOperator(op);
      return;
    }

    switch (action) {
      case 'decimal':
        appendDecimal();
        break;
      case 'negate':
        toggleSign();
        break;
      case 'backspace':
        backspace();
        break;
      case 'clear-entry':
        clearEntry();
        break;
      case 'all-clear':
        allClear();
        break;
      case 'calculate':
        compute();
        break;
      // Scientific functions
      case 'sin':
      case 'cos':
      case 'tan':
      case 'sqrt':
      case 'square':
      case 'log':
      case 'ln':
      case 'pi':
      case 'e':
      case 'power':
      case 'reciprocal':
      case 'percent':
        applyScientific(action);
        break;
    }
  });
});

// Mode Switching (Standard / Scientific)
btnModeStd.addEventListener('click', () => {
  btnModeStd.classList.add('active');
  btnModeSci.classList.remove('active');
  scientificPad.classList.add('hidden');
});

btnModeSci.addEventListener('click', () => {
  btnModeSci.classList.add('active');
  btnModeStd.classList.remove('active');
  scientificPad.classList.remove('hidden');
});

// History Drawer Toggle
btnHistoryToggle.addEventListener('click', () => {
  historyDrawer.classList.toggle('open');
});

btnClearHistory.addEventListener('click', () => {
  history = [];
  try {
    localStorage.removeItem('calc_history');
  } catch (e) {}
  renderHistory();
});

btnCopy.addEventListener('click', copyResult);

// Keyboard Support
window.addEventListener('keydown', (e) => {
  // Disregard if inside an input or modifier keys
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'c' || e.key === 'C') {
      copyResult();
      return;
    }
    return;
  }

  if (e.key >= '0' && e.key <= '9') {
    appendNumber(e.key);
    highlightButton(`[data-number="${e.key}"]`);
  } else if (e.key === '.') {
    appendDecimal();
    highlightButton('[data-action="decimal"]');
  } else if (e.key === '+') {
    chooseOperator('+');
    highlightButton('[data-action="add"]');
  } else if (e.key === '-') {
    chooseOperator('−');
    highlightButton('[data-action="subtract"]');
  } else if (e.key === '*' || e.key === 'x' || e.key === 'X') {
    chooseOperator('×');
    highlightButton('[data-action="multiply"]');
  } else if (e.key === '/') {
    e.preventDefault();
    chooseOperator('÷');
    highlightButton('[data-action="divide"]');
  } else if (e.key === '^') {
    applyScientific('power');
  } else if (e.key === '%') {
    applyScientific('percent');
  } else if (e.key === 'Enter' || e.key === '=') {
    e.preventDefault();
    compute();
    highlightButton('[data-action="calculate"]');
  } else if (e.key === 'Backspace') {
    backspace();
    highlightButton('[data-action="backspace"]');
  } else if (e.key === 'Escape') {
    allClear();
    highlightButton('[data-action="all-clear"]');
  }
});

function highlightButton(selector) {
  const btn = document.querySelector(selector);
  if (btn) {
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 120);
  }
}

// Initial display setup
updateDisplay();
