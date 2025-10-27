// example2_script.js
// 驗證 Email 與手機欄位，拋出自訂訊息後再提示使用者

const form = document.getElementById('contact-form');
const email = document.getElementById('email');
const phone = document.getElementById('phone');
const phoneError = document.getElementById("phone-error");
const emailError = document.getElementById("email-error");

/* 因為有另外設方法且每個欄位要求的規則式不一樣，為了讓助教容易檢查我就分為兩種方法
function showValidity(input) {
  if (input.validity.valueMissing) {
    input.setCustomValidity('這個欄位必填');
  } else if (input.validity.typeMismatch) {
    input.setCustomValidity('格式不正確，請確認輸入內容');
  } else if (input.validity.patternMismatch) {
    input.setCustomValidity(input.title || '格式不正確');
  } else {
    input.setCustomValidity('');
  }
  return input.reportValidity();
}
*/

function phoneValidate(){ // 從example3.js偷來的方法
  const value = phone.value.trim();
  const regexPhone = /^09[0-9]{8}$/.test(value); // 電話的regex 檢查是否符合規則用，test.value()很重要g
  let msg = "";
  if(!value){
    msg = "請輸入電話號碼，以 09 開頭共十碼";
  }else if (value && !regexPhone){
    msg = "電話號碼需以 09 開頭共十碼";
  }
  phone.setCustomValidity(msg);
  phoneError.textContent = msg;
  return !msg;
}

function emailValidate(){ // 從上面偷來的方法
  const value = email.value.trim();
  const regexMail = /^[A-Za-z0-9._%+-]+@o365.tku.edu.tw$/.test(value); // email regex 檢查是否符合規則用，test.value()很重要
  let msg = "";
  if(!value){
    msg = "請輸入 Email ，並以 @o365.tku.edu.tw 結尾";
  }else if (value && !regexMail){
    msg = "Email 請以 @o365.tku.edu.tw 結尾";
  }
  email.setCustomValidity(msg);
  emailError.textContent = msg;
  return !msg;
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const emailOk = emailValidate(email);
  const phoneOk = phoneValidate(phone);
  if (emailOk && phoneOk) {
    alert('表單驗證成功，準備送出資料');
    form.reset();
  }
});

email.addEventListener('blur', () => {
  showValidity(email);
});

phone.addEventListener('blur', () => {
  showValidity(phone);
});


