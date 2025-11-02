
const form = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('emailContact');
const phoneInput = document.getElementById('phone');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');

const pwdBar = document.getElementById('pwdBar');
const pwdChecklist = document.getElementById('pwdChecklist');
const pwdStrength = document.getElementById('pwdStrength');

const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

// 顯示密碼&小動物
const pwToggle = document.getElementById('pwToggle');
const pwMascot = document.getElementById('pwMascot');

// 興趣標籤
const interestsGroup = document.getElementById('interestsGroup');
const interestsHidden = document.getElementById('interestsValue');
const interestErr = document.getElementById('interestErr');
const interestOtherInput = document.getElementById('interestOtherInput');

// 條款
const openTermsBtn = document.getElementById('openTerms');
const termsOverlay = document.getElementById('termsOverlay');
const closeTermsBtn = document.getElementById('closeTerms');
const footerCloseBtn = document.getElementById('footerClose');
const termsBody = document.getElementById('termsBody');
const agreeTerms = document.getElementById('agreeTerms');

const STORAGE_KEY = 'week07_signup_form';


function showError(input, msg) {
  // 有些是 hidden，或在自訂容器裡，要往上找
  const field =
    input.closest('.field') ||
    input.closest('.terms-check') ||
    input.closest('.tag-group') ||
    input.parentElement;

  if (!field) return;

  // 功能要求3：客製訊息：使用 setCustomValidity() 提供中文錯誤說明，並寫入欄位下方 <p>。
  const err =
    field.querySelector('.field-error, .terms-hint') ||
    document.getElementById(input.getAttribute('aria-describedby'));

  if (input.classList) {
    input.classList.add('is-invalid');
  }

  if (err) {
    err.textContent = msg;
    err.classList.add('show');
  }


  if (input.setCustomValidity) {
    input.setCustomValidity(msg || '');
  }
}


function clearError(input) {
  const field =
    input.closest('.field') ||
    input.closest('.terms-check') ||
    input.closest('.tag-group') ||
    input.parentElement;

  if (!field) return;

  const err =
    field.querySelector('.field-error, .terms-hint') ||
    document.getElementById(input.getAttribute('aria-describedby'));

  if (input.classList) {
    input.classList.remove('is-invalid');
  }

  if (err) {
    err.textContent = '';
    err.classList.remove('show');
  }

  if (input.setCustomValidity) {
    input.setCustomValidity('');
  }
}

// Name驗證
function validateName() {
  if (!nameInput.value.trim()) {
    showError(nameInput, '請輸入姓名');
    return false;
  }
  clearError(nameInput);
  return true;
}

// Email驗證
function validateEmail() {
  if (!emailInput.value.trim()) {
    showError(emailInput, '請輸入 Email');
    return false;
  }
  if (!emailInput.checkValidity()) {
    showError(emailInput, 'Email 格式不正確');
    return false;
  }
  clearError(emailInput);
  return true;
}

// 電話驗證
function validatePhone() {
  const v = phoneInput.value.trim();
  const reg = /^09[0-9]{8}$/; // 09 + 8碼
  if (!v) {
    showError(phoneInput, '請輸入手機號碼');
    return false;
  }
  if (!reg.test(v)) {
    showError(phoneInput, '手機格式錯誤，請輸入 09 開頭的 10 碼數字');
    return false;
  }
  clearError(phoneInput);
  return true;
}

// 密碼驗證
function checkPasswordRules() {
  const pwd = passwordInput.value;
  const confirmPwd = confirmInput.value;

  const lengthValid = pwd.length >= 8;
  const caseValid = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd);
  const numberValid = /[0-9]/.test(pwd);
  const matchValid = confirmPwd.length > 0 && pwd === confirmPwd;

  // 更新每一條 checklist
  updateChecklist('length', lengthValid);
  updateChecklist('case', caseValid);
  updateChecklist('number', numberValid);
  updateChecklist('match', matchValid);

  // 計分
  let score = 0;
  if (lengthValid) score++;
  if (caseValid) score++;
  if (numberValid) score++;

  // 加分功能2：顯示密碼強度條（弱/中/強），即時更新顏色與文字。
  const percent = (score / 3) * 100;
  pwdBar.style.width = percent + '%';
  pwdBar.classList.remove('medium', 'strong');

  // 文字
  pwdStrength.classList.remove('default', 'weak', 'medium', 'strong');

  if (score === 0) {
    pwdStrength.textContent = '密碼強度：';
    pwdStrength.classList.add('default');
  } else if (score === 1) {
    pwdStrength.textContent = '密碼強度：弱';
    pwdStrength.classList.add('weak');
  } else if (score === 2) {
    pwdBar.classList.add('medium');
    pwdStrength.textContent = '密碼強度：中';
    pwdStrength.classList.add('medium');
  } else if (score === 3 || score === 4) {
    pwdBar.classList.add('strong');
    pwdStrength.textContent = '密碼強度：強';
    pwdStrength.classList.add('strong');
  }

  return score === 4;
}


function updateChecklist(rule, ok) {
  const item = pwdChecklist.querySelector(`[data-rule="${rule}"]`);
  if (!item) return;
  if (ok) {
    item.classList.add('valid');
  } else {
    item.classList.remove('valid');
  }
}

// 密碼規則驗證
function validatePassword() {
  if (!passwordInput.value.trim()) {
    showError(passwordInput, '請輸入密碼');
    checkPasswordRules();
    return false;
  }
  checkPasswordRules();
  clearError(passwordInput);
  return true;
}

// 確認是不是跟上面的密碼一樣
function validateConfirmPassword() {
  if (!confirmInput.value.trim()) {
    showError(confirmInput, '請再次輸入密碼');
    checkPasswordRules();
    return false;
  }
  if (confirmInput.value !== passwordInput.value) {
    showError(confirmInput, '兩次密碼不一致');
    checkPasswordRules();
    return false;
  }
  clearError(confirmInput);
  checkPasswordRules();
  return true;
}

// 興趣欄位驗證
function validateInterests() {
  const activeButtons = interestsGroup.querySelectorAll('.tag-btn.active');
  const picked = [];

  activeButtons.forEach((btn) => {
    const val = btn.dataset.value;
    if (val === 'other') {
      const extra = interestOtherInput.value.trim();
      if (extra) {
        picked.push(extra);
      }
    } else {
      picked.push(val);
    }
  });

  // 沒選
  // 功能要求3：客製訊息：使用 setCustomValidity() 提供中文錯誤說明，並寫入欄位下方 <p>。
  if (picked.length === 0) {
    interestsGroup.classList.add('invalid');
    interestErr.classList.add('show');
    interestsHidden.value = '';
    interestsHidden.setCustomValidity('請至少選擇一個興趣');
    return false;
  }

  // 有選
  interestsGroup.classList.remove('invalid');
  interestErr.classList.remove('show');
  interestsHidden.value = picked.join(',');
  interestsHidden.setCustomValidity('');
  return true;
}

// 功能要求1：興趣標籤區塊採用父層監聽切換樣式或計數。
interestsGroup.addEventListener('click', (e) => {
  const btn = e.target.closest('.tag-btn');
  if (!btn) return;

  const isOther = btn.dataset.value === 'other';

  // 切換勾選狀態
  btn.classList.toggle('active');

  // 如果是「其他」要控制輸入框
  if (isOther) {
    const active = btn.classList.contains('active');
    if (active) {
      interestOtherInput.classList.remove('hidden');
      interestOtherInput.focus();
    } else {
      interestOtherInput.value = '';
      interestOtherInput.classList.add('hidden');
    }
  }

  validateInterests();
  saveToStorage();
});

// 「其他」輸入框輸入時也要重新驗證
interestOtherInput.addEventListener('input', () => {
  validateInterests();
  saveToStorage();
});

// 條款驗證，沒有閱讀就想打勾包一包
openTermsBtn.addEventListener('click', (e) => {
  e.preventDefault();
  termsOverlay.classList.add('show');
  // 打開時先鎖住勾勾
  agreeTerms.checked = false;
  agreeTerms.disabled = true;
  // 回到最頂
  termsBody.scrollTop = 0;
});
const footerTerms = document.getElementById('footerTerms');
if (footerTerms) {
  footerTerms.addEventListener('click', (e) => {
    e.preventDefault();
    openTermsBtn.click(); // 直接呼叫原本那顆的 click
  });
}

function closeTerms() {
  termsOverlay.classList.remove('show');
}
closeTermsBtn.addEventListener('click', closeTerms);
footerCloseBtn.addEventListener('click', closeTerms);
// 點背景也可以關
termsOverlay.addEventListener('click', (e) => {
  if (e.target === termsOverlay) {
    closeTerms();
  }
});

// 捲到最底才開啟勾勾
termsBody.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = termsBody;
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    agreeTerms.disabled = false;
  }
});

// 密碼顯示按鈕
pwToggle.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  if (isHidden) {
    passwordInput.type = 'text';
    pwToggle.textContent = '🙈';
    pwMascot.classList.add('shy');
  } else {
    passwordInput.type = 'password';
    pwToggle.textContent = '👁';
    pwMascot.classList.remove('shy');
  }
});

// 之前忘記註冊哪個網站，他們就是有一隻鳥會跟著滑鼠走，按顯示密碼後，鳥就會用翅膀遮眼睛
document.addEventListener('mousemove', (evt) => {
  if (!pwMascot || pwMascot.classList.contains('shy')) return;

  const rect = pwMascot.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (evt.clientX - cx) / rect.width;
  const dy = (evt.clientY - cy) / rect.height;

  const maxShift = 3;
  const moveX = Math.max(Math.min(dx * maxShift, maxShift), -maxShift);
  const moveY = Math.max(Math.min(dy * maxShift, maxShift), -maxShift);

  pwMascot.style.setProperty('--eye-x', moveX + 'px');
  pwMascot.style.setProperty('--eye-y', moveY + 'px');
});

// 加分功能1：使用 localStorage 暫存欄位內容，重新整理後可恢復未送出的資料。
function saveToStorage() {
  const data = {
    name: nameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    interests: interestsHidden.value
    // 密碼不存，安全觀感
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.name) nameInput.value = data.name;
    if (data.email) emailInput.value = data.email;
    if (data.phone) phoneInput.value = data.phone;
    if (data.interests) {
      const selected = data.interests.split(',').filter(Boolean);
      selected.forEach((val) => {
        const btn = interestsGroup.querySelector(`.tag-btn[data-value="${val}"]`);
        if (btn) {
          btn.classList.add('active');
        } else {
          // 如果當時選的是「其他」，顯示輸入框
          interestsGroup
            .querySelector('.tag-btn[data-value="other"]')
            ?.classList.add('active');
          interestOtherInput.classList.remove('hidden');
          interestOtherInput.value = val;
        }
      });
      interestsHidden.value = data.interests;
    }
  } catch (err) {
    console.warn('load error', err);
  }
}
loadFromStorage();

// 功能要求2：即時驗證：在欄位 blur 後啟用錯誤提示，input 時即時更新。
nameInput.addEventListener('blur', validateName);
emailInput.addEventListener('blur', validateEmail);
phoneInput.addEventListener('blur', validatePhone);
passwordInput.addEventListener('blur', validatePassword);
confirmInput.addEventListener('blur', validateConfirmPassword);

[nameInput, emailInput, phoneInput].forEach((el) => {
  el.addEventListener('input', () => {
    clearError(el);
    saveToStorage();
  });
});

passwordInput.addEventListener('input', () => {
  clearError(passwordInput);
  checkPasswordRules();
  if (confirmInput.value) {
    validateConfirmPassword();
  }
});

confirmInput.addEventListener('input', () => {
  validateConfirmPassword();
});

[nameInput, emailInput, phoneInput, passwordInput, confirmInput, interestOtherInput].forEach((el) => {
  el.addEventListener('input', () => { clearError(el); saveToStorage(); checkFormValidity(); });
  el.addEventListener('blur', () => {
    const map = {
      name: validateName,
      emailContact: validateEmail,
      phone: validatePhone,
      password: validatePassword,
      confirmPassword: validateConfirmPassword
    };
    map[el.id]?.();
    checkFormValidity();
  });
});
agreeTerms.addEventListener('change', checkFormValidity);

// 若要求沒有全部達成，建立帳號的按鈕就不會開放點擊
submitBtn.disabled = true;
function checkFormValidity() {
  const allValid =
    validateName() &&
    validateEmail() &&
    validatePhone() &&
    validatePassword() &&
    validateConfirmPassword() &&
    validateInterests() &&
    agreeTerms.checked;
  submitBtn.disabled = !allValid;
  submitBtn.classList.toggle('btn-enabled', allValid);
}

// 功能要求5：送出攔截：submit 事件需檢查所有欄位並聚焦第一個錯誤；成功後模擬送出狀態 1 秒並顯示成功訊息。
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const v1 = validateName();
  const v2 = validateEmail();
  const v3 = validatePhone();
  const v4 = validatePassword();
  const v5 = validateConfirmPassword();
  const v6 = validateInterests();
  const v7 = agreeTerms.checked;

  // 有任一項不過就拉回去
  if (!(v1 && v2 && v3 && v4 && v5 && v6 && v7)) {
    const order = [
      nameInput,
      emailInput,
      phoneInput,
      passwordInput,
      confirmInput,
      interestsGroup,
      agreeTerms
    ];

    for (const el of order) {
      if (el.classList && el.classList.contains('is-invalid')) {
        el.focus();
        break;
      }
      if (el === interestsGroup && interestsGroup.classList.contains('invalid')) {
        interestsGroup.querySelector('.tag-btn')?.focus();
        break;
      }
      if (el === agreeTerms && !agreeTerms.checked) {
        openTermsBtn.focus();
        break;
      }
    }

    if (!agreeTerms.checked) {
      alert('請先閱讀並勾選服務條款。');
    }
    return;
  }

  // 功能要求6：防重送：送出過程中將主要按鈕設為 disabled 並顯示 Loading 樣式。
  submitBtn.disabled = true;
  submitBtn.textContent = '建立中...';

  // 功能要求5：送出攔截：submit 事件需檢查所有欄位並聚焦第一個錯誤；成功後模擬送出狀態 1 秒並顯示成功訊息。
  await new Promise((r) => setTimeout(r, 1000));
  alert('註冊成功！');
  // 表單reset
  form.reset();
  submitBtn.disabled = true;
  submitBtn.textContent = '建立帳號';

  // 密碼區塊reset
  resetPasswordUI();

  // 興趣相關reset
  interestsGroup.querySelectorAll('.tag-btn').forEach((btn) => btn.classList.remove('active'));
  interestsGroup.classList.remove('invalid');
  interestErr.classList.remove('show');
  interestsHidden.value = '';
  interestOtherInput.value = '';
  interestOtherInput.classList.add('hidden');

  // 條款reset
  agreeTerms.checked = false;
  agreeTerms.disabled = true;

  // 清暫存
  localStorage.removeItem(STORAGE_KEY);
});

// 加分功能3：實作「重設」按鈕，清除欄位與錯誤訊息，並重置強度條。
resetBtn.addEventListener('click', () => {
  submitBtn.disabled = true;
  form.reset();
  [nameInput, emailInput, phoneInput, passwordInput, confirmInput].forEach(clearError);

  // 密碼區塊reset
  resetPasswordUI();

  // 興趣reset
  interestsGroup.querySelectorAll('.tag-btn').forEach((btn) => btn.classList.remove('active'));
  interestsGroup.classList.remove('invalid');
  interestErr.classList.remove('show');
  interestsHidden.value = '';
  interestOtherInput.value = '';
  interestOtherInput.classList.add('hidden');

  // 條款reset
  agreeTerms.checked = false;
  agreeTerms.disabled = true;

  // 清暫存
  localStorage.removeItem(STORAGE_KEY);
});

// 重置密碼比較複雜，我寫一個方法老師比較好閱讀
function resetPasswordUI() {
  pwdBar.style.width = '0%';
  pwdBar.classList.remove('medium', 'strong');
  pwdStrength.textContent = '密碼強度：';
  pwdStrength.className = 'pwd-strength';
  pwdChecklist.querySelectorAll('li').forEach((li) => li.classList.remove('valid'));
  pwToggle.textContent = '👁';
  pwMascot.classList.remove('shy');
}

function checkFormValidity() {
  const allValid = (
    validateName() &&
    validateEmail() &&
    validatePhone() &&
    validatePassword() &&
    validateConfirmPassword() &&
    validateInterests() &&
    agreeTerms.checked
  );

  submitBtn.disabled = !allValid;
}