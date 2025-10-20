// example4_script.js
// 判斷輸入數字是否為奇數或偶數

var input = prompt('請輸入一個整數：');
var n = parseInt(input, 10);
var msg = '';

if (isNaN(n)) {
  msg = '輸入不是有效的整數！';
} else if (n % 2 === 0) {
  msg = n + ' 是偶數';
} else {
  msg = n + ' 是奇數';
}

// 額外示範 switch（1、2、3 對應文字）
var choice = prompt('輸入 1/2/3 試試 switch：');
switch (choice) {
  case '1':
    msg += '\n你輸入了 1';
    break;
  case '2':
    msg += '\n你輸入了 2';
    break;
  case '3':
    msg += '\n你輸入了 3';
    break;
  default:
    msg += '\n非 1/2/3';
}

document.getElementById('result').textContent = msg;

var score = prompt('輸入成績輸入分數（0–100）：');
score = parseInt(score);
var grade = '';
switch(true){
  case (score >= 90):
    grade += 'A';
    break;
  case (score >= 80):
    grade += 'B';
    break;
  case (score >= 70):
    grade += 'C';
    break;
  case (score >= 60):
    grade += 'D';
    break;
  case (score >= 0 && score < 60):
    grade += "F";
    break;
  default:
    grade += "Invalid Score!"
    break;
}

document.getElementById('extension').textContent = grade;
