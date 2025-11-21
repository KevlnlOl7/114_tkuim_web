// ==========================================
// 1. DOM 元素
// ==========================================
const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

// 密碼相關
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirmPassword');
const pwToggle = document.getElementById('pwToggle');
const pwMascot = document.getElementById('pwMascot');
const pwdBar = document.getElementById('pwdBar');
const pwdStrength = document.getElementById('pwdStrength');
const pwdChecklist = document.getElementById('pwdChecklist');

// 興趣標籤
const interestsGroup = document.getElementById('interestsGroup');
const interestsHidden = document.getElementById('interestsValue');
const interestOtherBtn = document.getElementById('interestOtherBtn');
const interestOtherInput = document.getElementById('interestOtherInput');

// 條款
const openTermsBtn = document.getElementById('openTerms');
const termsOverlay = document.getElementById('termsOverlay');
const closeTermsBtn = document.getElementById('closeTerms');
const footerCloseBtn = document.getElementById('footerClose');
const termsBody = document.getElementById('termsBody');
const agreeTerms = document.getElementById('agreeTerms');
const footerTerms = document.getElementById('footerTerms');

// 查看清單
const fetchListBtn = document.getElementById('fetchListBtn');
const listResult = document.getElementById('listResult');

const STORAGE_KEY = 'week09_signup_form';

// ==========================================
// 2. 即時驗證所有欄位（新增）
// ==========================================
function checkFormValidity() {
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('emailContact');
  const phoneInput = document.getElementById('phone');

  const name = nameInput?.value.trim();
  const email = emailInput?.value.trim();
  const phone = phoneInput?.value.trim();
  const password = passwordInput?.value || '';
  const confirmPassword = confirmInput?.value || '';
  const interests = interestsHidden?.value || '';
  const termsChecked = agreeTerms?.checked;

  // 逐項檢查
  const checks = {
    name: name.length > 0,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    phone: /^09\d{8}$/.test(phone),
    passwordLength: password.length >= 8,
    passwordCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    passwordNumber: /[0-9]/.test(password),
    passwordMatch: password === confirmPassword && confirmPassword.length > 0,
    interests: interests.length > 0,
    terms: termsChecked === true
  };

  // 即時視覺回饋
  validateField(nameInput, checks.name, '請輸入姓名');
  validateField(emailInput, checks.email && email.length > 0, 'Email 格式不正確');
  validateField(phoneInput, checks.phone && phone.length > 0, '手機需為 09 開頭 10 碼');

  // 確認密碼的即時回饋
  if (confirmPassword.length > 0 && !checks.passwordMatch) {
    confirmInput.style.borderColor = '#e74c3c';
  } else if (confirmPassword.length > 0 && checks.passwordMatch) {
    confirmInput.style.borderColor = '#27ae60';
  } else {
    confirmInput.style.borderColor = '';
  }

  // 全部通過才啟用按鈕
  const allValid = Object.values(checks).every(Boolean);

  submitBtn.disabled = !allValid;

  if (allValid) {
    submitBtn.style.opacity = '1';
    submitBtn.style.cursor = 'pointer';
  } else {
    submitBtn.style.opacity = '0.5';
    submitBtn.style.cursor = 'not-allowed';
  }

  // 顯示缺少什麼
  updateSubmitHint(checks);
}

// ==========================================
// 輔助函數：驗證單一欄位
// ==========================================
function validateField(input, isValid, errorMessage) {
  if (!input) return;

  const value = input.value.trim();

  // 如果欄位是空的，不顯示錯誤（避免一開始就紅框）
  if (value.length === 0) {
    input.style.borderColor = '';
    return;
  }

  // 有輸入內容時才顯示正確/錯誤
  if (isValid) {
    input.style.borderColor = '#27ae60'; // 綠色
  } else {
    input.style.borderColor = '#e74c3c'; // 紅色
  }
}

// ==========================================
// 輔助函數：顯示提示訊息
// ==========================================
function updateSubmitHint(checks) {
  const hintElement = document.getElementById('submitHint');
  if (!hintElement) return;

  const allValid = Object.values(checks).every(Boolean);

  if (allValid) {
    hintElement.textContent = '所有欄位已完成，可以送出';
    hintElement.style.color = '#27ae60';
  } else {
    const missing = [];
    if (!checks.name) missing.push('姓名');
    if (!checks.email) missing.push('Email');
    if (!checks.phone) missing.push('手機');
    if (!checks.passwordLength || !checks.passwordCase || !checks.passwordNumber) {
      missing.push('密碼');
    }
    if (!checks.passwordMatch) missing.push('確認密碼');
    if (!checks.interests) missing.push('興趣');
    if (!checks.terms) missing.push('同意條款');

    hintElement.textContent = `需填入 / 修正的欄位：${missing.join('、')}`;
    hintElement.style.color = '#e74c3c';
  }
}

// ==========================================
// 3. 密碼強度指示器（純 UI 回饋，不做驗證）
// ==========================================
function updatePasswordStrength() {
  const pwd = passwordInput.value;
  const confirm = confirmInput.value;

  const rules = {
    length: pwd.length >= 8,
    case: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    match: confirm && pwd === confirm
  };

  // 更新檢查清單視覺
  Object.entries(rules).forEach(([key, valid]) => {
    const item = pwdChecklist?.querySelector(`[data-rule="${key}"]`);
    if (item) item.classList.toggle('valid', valid);
  });

  // 計算強度（不包含 match）
  const score = [rules.length, rules.case, rules.number, rules.match].filter(Boolean).length;
  const percent = (score / 4) * 100;

  pwdBar.style.width = percent + '%';
  pwdBar.className = 'pwd-bar';
  pwdStrength.className = 'pwd-strength';

  if (score === 0) {
    pwdStrength.textContent = '密碼強度：';
  } else if (score === 1) {
    pwdStrength.textContent = '密碼強度：弱';
    pwdBar.classList.add('weak');
  } else if (score === 2 || score === 3) {
    pwdStrength.textContent = '密碼強度：中';
    pwdBar.classList.add('medium');
  } else {
    pwdStrength.textContent = '密碼強度：強';
    pwdBar.classList.add('strong');
  }

  //  每次密碼變化都檢查整個表單
  checkFormValidity();
}

passwordInput?.addEventListener('input', updatePasswordStrength);
confirmInput?.addEventListener('input', updatePasswordStrength);

// ==========================================
// 4. 密碼顯示切換 & 小動物
// ==========================================
pwToggle?.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  pwToggle.textContent = isPassword ? '🙈' : '👁';
  pwMascot?.classList.toggle('shy', isPassword);
});

// 小動物眼睛跟隨滑鼠
document.addEventListener('mousemove', (e) => {
  if (!pwMascot || pwMascot.classList.contains('shy')) return;

  const rect = pwMascot.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = (e.clientX - cx) / rect.width;
  const dy = (e.clientY - cy) / rect.height;

  const maxShift = 3;
  const moveX = Math.max(Math.min(dx * maxShift, maxShift), -maxShift);
  const moveY = Math.max(Math.min(dy * maxShift, maxShift), -maxShift);

  pwMascot.style.setProperty('--eye-x', moveX + 'px');
  pwMascot.style.setProperty('--eye-y', moveY + 'px');
});

// ==========================================
// 5. 興趣標籤選取
// ==========================================
interestsGroup?.addEventListener('click', (e) => {
  const btn = e.target.closest('.tag-btn');
  if (!btn) return;

  btn.classList.toggle('active');

  // 處理「其他」選項
  if (btn === interestOtherBtn) {
    if (btn.classList.contains('active')) {
      interestOtherInput.classList.remove('hidden');
      interestOtherInput.focus();
    } else {
      interestOtherInput.value = '';
      interestOtherInput.classList.add('hidden');
    }
  }

  updateInterestsValue();
  saveToStorage();
  checkFormValidity(); //  檢查表單
});

interestOtherInput?.addEventListener('input', () => {
  updateInterestsValue();
  saveToStorage();
  checkFormValidity(); //  檢查表單
});

function updateInterestsValue() {
  const selected = [];
  interestsGroup.querySelectorAll('.tag-btn.active').forEach(btn => {
    if (btn.dataset.value === 'other') {
      const custom = interestOtherInput.value.trim();
      if (custom) selected.push(custom);
    } else {
      selected.push(btn.dataset.value);
    }
  });
  interestsHidden.value = selected.join(',');
}

// ==========================================
// 6. 條款彈窗
// ==========================================
function openTerms(e) {
  e.preventDefault();
  termsOverlay.classList.add('show');
  agreeTerms.checked = false;
  agreeTerms.disabled = true;
  termsBody.scrollTop = 0;
}

function closeTerms() {
  termsOverlay.classList.remove('show');
}

openTermsBtn?.addEventListener('click', openTerms);
footerTerms?.addEventListener('click', openTerms);
closeTermsBtn?.addEventListener('click', closeTerms);
footerCloseBtn?.addEventListener('click', closeTerms);
termsOverlay?.addEventListener('click', (e) => {
  if (e.target === termsOverlay) closeTerms();
});

// 捲到底才能勾選
termsBody?.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = termsBody;
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    agreeTerms.disabled = false;
  }
});

//  條款勾選時檢查表單
agreeTerms?.addEventListener('change', checkFormValidity);

// ==========================================
// 7. 監聽其他欄位變化（新增）
// ==========================================
document.getElementById('name')?.addEventListener('input', checkFormValidity);
document.getElementById('emailContact')?.addEventListener('input', checkFormValidity);
document.getElementById('phone')?.addEventListener('input', checkFormValidity);

// ==========================================
// 8. LocalStorage 自動儲存
// ==========================================
function saveToStorage() {
  const data = {
    name: document.getElementById('name')?.value || '',
    email: document.getElementById('emailContact')?.value || '',
    phone: document.getElementById('phone')?.value || '',
    interests: interestsHidden.value
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    if (data.name) document.getElementById('name').value = data.name;
    if (data.email) document.getElementById('emailContact').value = data.email;
    if (data.phone) document.getElementById('phone').value = data.phone;

    // 恢復興趣選取
    if (data.interests) {
      data.interests.split(',').forEach(val => {
        const btn = interestsGroup.querySelector(`[data-value="${val}"]`);
        if (btn) {
          btn.classList.add('active');
        } else {
          // 自訂興趣
          interestOtherBtn?.classList.add('active');
          interestOtherInput.classList.remove('hidden');
          interestOtherInput.value = val;
        }
      });
      updateInterestsValue();
    }
  } catch (err) {
    console.warn('載入草稿失敗', err);
  }
}

// 表單輸入時自動儲存
['input', 'change'].forEach(event => {
  form?.addEventListener(event, saveToStorage);
});

// ==========================================
// 9. 表單送出（核心邏輯）
// ==========================================
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.interests = payload.interests ? payload.interests.split(',').filter(Boolean) : [];
  payload.terms = agreeTerms.checked;

  //  理論上按鈕 disabled 時不會執行到這裡，但保留檢查
  if (!payload.terms) {
    alert('請先閱讀並同意服務條款');
    return;
  }

  console.log('Sending payload:', payload);
  console.log('terms 的值:', payload.terms, '型別:', typeof payload.terms);

  try {
    // 作業要求：前端-2 表單送出時顯示 Loading 狀態，並防止重複送出
    submitBtn.disabled = true;
    submitBtn.textContent = '送出中...';

    // 使用重試函數（伺服器錯誤時會自動重試一次）
    // 作業要求：前端-1 使用 fetch 串接 API，顯示成功／失敗訊息。
    const response = await fetchWithRetry(
      'http://localhost:3001/api/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      },
      1 // 最多重試 1 次
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || '報名失敗');
    }

    alert(result.message);
    form.reset();

    // 清除 UI 狀態
    pwdBar.style.width = '0%';
    pwdBar.className = 'pwd-bar';
    pwdStrength.textContent = '密碼強度：';
    pwdChecklist.querySelectorAll('li').forEach(li => li.classList.remove('valid'));
    passwordInput.type = 'password';
    pwToggle.textContent = '👁';
    pwMascot?.classList.remove('shy');
    interestsGroup.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
    interestOtherInput.value = '';
    interestOtherInput.classList.add('hidden');
    interestsHidden.value = '';
    agreeTerms.checked = false;
    agreeTerms.disabled = true;
    localStorage.removeItem(STORAGE_KEY);

  } catch (error) {
    if (error.message === 'Failed to fetch') {
      alert('無法連線到伺服器，已嘗試重試但仍然失敗');
    } else {
      alert(error.message);
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '建立帳號';
    checkFormValidity(); // 重新檢查表單狀態
  }
});

// ==========================================
// 10. 重設按鈕
// ==========================================
resetBtn?.addEventListener('click', () => {
  form.reset();

  pwdBar.style.width = '0%';
  pwdBar.className = 'pwd-bar';
  pwdStrength.textContent = '密碼強度：';
  pwdChecklist.querySelectorAll('li').forEach(li => li.classList.remove('valid'));
  passwordInput.type = 'password';
  pwToggle.textContent = '👁';
  pwMascot?.classList.remove('shy');

  interestsGroup.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
  interestOtherInput.value = '';
  interestOtherInput.classList.add('hidden');
  interestsHidden.value = '';

  agreeTerms.checked = false;
  agreeTerms.disabled = true;

  localStorage.removeItem(STORAGE_KEY);

  if (listResult) listResult.style.display = 'none';

  // 直接設定按鈕為 disabled
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.5';
  submitBtn.style.cursor = 'not-allowed';
  submitBtn.title = '請完成所有必填欄位';
});

// ==========================================
// 11. 查看報名清單
// 作業要求：前端-3 新增「查看報名清單」按鈕，呼叫 GET /api/signup 顯示結果（可用 <pre>）。
// ==========================================
fetchListBtn?.addEventListener('click', async () => {
  try {
    fetchListBtn.disabled = true;
    fetchListBtn.textContent = '讀取中...';

    const res = await fetch('http://localhost:3001/api/signup');
    const data = await res.json();

    // 顯示結果區域
    listResult.style.display = 'block';

    // 更新總數
    const listCount = document.getElementById('listCount');
    if (listCount) listCount.textContent = data.total;

    const tableBody = document.getElementById('listTableBody');
    const emptyState = document.getElementById('emptyState');

    // 清空舊資料
    if (tableBody) tableBody.innerHTML = '';

    // 如果有資料
    if (data.data && data.data.length > 0) {
      if (emptyState) emptyState.style.display = 'none';

      data.data.forEach(participant => {
        const row = createTableRow(participant);
        tableBody.appendChild(row);
      });
    } else {
      // 沒有資料時顯示空狀態
      if (emptyState) emptyState.style.display = 'block';
    }

  } catch (error) {
    alert(error.message);
  } finally {
    fetchListBtn.disabled = false;
    fetchListBtn.textContent = '查看報名清單 (GET)';
  }
});

// ==========================================
// 輔助函數：建立表格列
// ==========================================
function createTableRow(participant) {
  const tr = document.createElement('tr');

  // 姓名
  const tdName = document.createElement('td');
  tdName.textContent = participant.name;

  // Email
  const tdEmail = document.createElement('td');
  tdEmail.textContent = participant.email;

  // 手機
  const tdPhone = document.createElement('td');
  tdPhone.textContent = participant.phone;

  // 興趣（標籤化）
  const tdInterests = document.createElement('td');
  if (participant.interests && participant.interests.length > 0) {
    participant.interests.forEach(interest => {
      const tag = document.createElement('span');
      tag.className = 'interest-tag';
      tag.textContent = interest;
      tdInterests.appendChild(tag);
    });
  } else {
    tdInterests.textContent = '-';
  }

  // 報名時間
  const tdTime = document.createElement('td');
  tdTime.className = 'datetime';
  tdTime.textContent = formatDateTime(participant.createdAt);

  // 操作按鈕
  const tdAction = document.createElement('td');
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '刪除';
  deleteBtn.onclick = () => deleteParticipant(participant.id);
  tdAction.appendChild(deleteBtn);

  tr.appendChild(tdName);
  tr.appendChild(tdEmail);
  tr.appendChild(tdPhone);
  tr.appendChild(tdInterests);
  tr.appendChild(tdTime);
  tr.appendChild(tdAction);

  return tr;
}

// ==========================================
// 輔助函數：格式化時間
// ==========================================
function formatDateTime(isoString) {
  if (!isoString) return '-';

  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// ==========================================
// 輔助函數：刪除參與者
// ==========================================
async function deleteParticipant(id) {
  if (!confirm('確定要刪除此筆報名資料嗎？')) {
    return;
  }

  try {
    const res = await fetch(`http://localhost:3001/api/signup/${id}`, {
      method: 'DELETE'
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || '刪除失敗');
    }

    alert(result.message);

    // 重新載入清單
    fetchListBtn.click();

  } catch (error) {
    alert('刪除失敗：' + error.message);
  }
}

// ==========================================
// 12. 重試函數
// 加分挑戰（每項 +5）：項目4 - 於前端加入重送機制（例如伺服器錯誤時 3 秒後自動重試一次）。
// ==========================================
async function fetchWithRetry(url, options, maxRetries = 1) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;

    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        console.log(`請求失敗，3 秒後重試 (${attempt + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        submitBtn.textContent = `重試中 (${attempt + 1}/${maxRetries})...`;
      }
    }
  }

  throw lastError;
}

// ==========================================
// 13. 初始化
// ==========================================
loadFromStorage();
checkFormValidity(); //  初始化時檢查一次表單狀態
