// example1_script.js
// 傳統語法：僅使用 var、function、字串串接

// 顯示提示窗
alert('歡迎來到 JavaScript！');

// 在 Console 顯示訊息
console.log('Hello JavaScript from console');

// 在頁面指定區域輸出文字
var el = document.getElementById('result');
el.textContent = '這行文字是由外部 JS 檔案寫入的。';

var stuName = document.getElementById('name');
stuName.textContent = '姓名：張傢寧';

var stuID = document.getElementById("stuID");
stuID.textContent = '學號：412630153';

const myButton = document.getElementById('myButton').addEventListener('click', () => {
  window.open('https://youtu.be/dQw4w9WgXcQ?si=glYM4GMWEs_APGag', '_blank', 'noopener,noreferrer');
});
