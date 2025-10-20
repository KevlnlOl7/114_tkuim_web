// example5_script.js
// 以巢狀 for 產生 1~9 的乘法表

var output = '';
for (var i = 1; i <= 9; i++) {
  for (var j = 1; j <= 9; j++) {
    output += i + 'x' + j + '=' + (i * j) + '\t';
  }
  output += '\n';
}
document.getElementById('result').textContent = output;

var begin = prompt('請輸入開始值');
var end = prompt('請輸入結束值');
begin = parseInt(begin);
end = parseInt(end);
var output_range = ''
for (var i = begin; i <= end; i++) {
    for (var j = 1; j <= 9; j++){
        output_range += i + "x" + j + '=' +(i * j) + '\t';
    }
    output_range += '\n';
}
document.getElementById('result2').textContent = output_range;
