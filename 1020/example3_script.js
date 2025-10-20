// example3_script.js
// 使用 prompt 取得輸入，並做基本運算

var name = prompt('請輸入你的名字：');
if (!name) {
  name = '同學';
}

var a = prompt('請輸入數字 A：');
var b = prompt('請輸入數字 B：');

var numA = parseFloat(a);
var numB = parseFloat(b);

var output = '';
output += '哈囉，' + name + '！\n\n';
output += 'A = ' + numA + ', B = ' + numB + '\n';
output += 'A + B = ' + (numA + numB) + '\n';
output += 'A - B = ' + (numA - numB) + '\n';
output += 'A * B = ' + (numA * numB) + '\n';
output += 'A / B = ' + (numA / numB) + '\n';
output += 'A % B = ' + (numA % numB) + '\n';
output += 'A > B ? ' + (numA > numB) + '\n';
output += 'A == B ? ' + (numA == numB) + '（僅比較值）\n';
output += 'A === B ? ' + (numA === numB) + '（比較值與型態）\n';

alert('計算完成，請看頁面結果與 Console');
console.log(output);
document.getElementById('result').textContent = output;

var extension = '';
extension += 'A % B = ' + (numA % numB) + '\n' + '% 是「取餘數」運算子，用來求出兩個數字相除後剩下的值，常用來判斷整除、奇偶或循環(防止陣列超出範圍，很適合用在rotation上，老師之前滿喜歡考的)計算。\n'
console.log(extension);
document.getElementById('extension').textContent = extension;