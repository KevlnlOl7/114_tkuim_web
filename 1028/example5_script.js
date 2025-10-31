// example5_script.js
// 攔截 submit，聚焦第一個錯誤並模擬送出流程

const form = document.getElementById('full-form');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
// 為了隱私權條款新增的const
const agreeCheckbox = document.getElementById('agree');
const privacyModalEl = document.getElementById('privacyModal');
const privacyConfirmBtn = document.getElementById('privacyConfirm');
const privacyRadios = privacyModalEl.querySelectorAll('input[name="privacyChoice"]');
const privacyModal = new bootstrap.Modal(privacyModalEl);


function validateAllInputs(formElement) {
  let firstInvalid = null;
  const controls = Array.from(formElement.querySelectorAll('input, select, textarea'));
  controls.forEach((control) => {
    control.classList.remove('is-invalid');
    if (!control.checkValidity()) {
      control.classList.add('is-invalid');
      if (!firstInvalid) {
        firstInvalid = control;
      }
    }
  });
  return firstInvalid;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = '送出中...';

  const firstInvalid = validateAllInputs(form);
  if (firstInvalid) {
    submitBtn.disabled = false;
    submitBtn.textContent = '送出';
    firstInvalid.focus();
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  alert('資料已送出，感謝您的聯絡！');
  form.reset();
  submitBtn.disabled = false;
  submitBtn.textContent = '送出';
});

resetBtn.addEventListener('click', () => {
  form.reset();
  Array.from(form.elements).forEach((element) => {
    element.classList.remove('is-invalid');
  });
});

form.addEventListener('input', (event) => {
  const target = event.target;
  if (target.classList.contains('is-invalid') && target.checkValidity()) {
    target.classList.remove('is-invalid');
  }
});

// 點擊頁面就會跳出隱私權條款的 frame
agreeCheckbox.addEventListener('click', (event) => {
  
  event.preventDefault();
  
  privacyRadios.forEach(r => r.checked = false);
  privacyConfirmBtn.disabled = true;
  // 打開條款
  privacyModal.show();
});

// 在 frame 裡選「我同意」才啟用確認鈕
privacyModalEl.addEventListener('change', (e) => {
  if (e.target.name === 'privacyChoice') {
    privacyConfirmBtn.disabled = (e.target.value !== 'agree');
  }
});

// 按下「確認」
privacyConfirmBtn.addEventListener('click', () => {
  const chosen = Array.from(privacyRadios).find(r => r.checked)?.value;
  if (chosen === 'agree') {
    // 這裡才真的勾起 checkbox
    agreeCheckbox.checked = true;
    agreeCheckbox.classList.remove('is-invalid');
  } else {
    // 選不同意就保持沒勾，使用者就是要給我勾，我才讓你使用我的服務
    agreeCheckbox.checked = false;
  }
  privacyModal.hide();
});
