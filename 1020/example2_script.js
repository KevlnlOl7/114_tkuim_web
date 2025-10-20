// example2_script.js
// 變數宣告與基本型態操作

var text = '123';              // 字串
var num = 45;                  // 數字
var isPass = true;             // 布林
var emptyValue = null;         // 空值
var notAssigned;               // undefined（尚未指定）

// 型態檢查
var lines = '';
lines += 'text = ' + text + '，typeof: ' + (typeof text) + '\n';
lines += 'num = ' + num + '，typeof: ' + (typeof num) + '\n';
lines += 'isPass = ' + isPass + '，typeof: ' + (typeof isPass) + '\n';
lines += 'emptyValue = ' + emptyValue + '，typeof: ' + (typeof emptyValue) + '\n';
lines += 'notAssigned = ' + notAssigned + '，typeof: ' + (typeof notAssigned) + '\n\n';

// 轉型
var textToNumber = parseInt(text, 10); // 將 '123' → 123
lines += 'parseInt(\'123\') = ' + textToNumber + '\n';
lines += 'String(45) = ' + String(num) + '\n';

document.getElementById('result').textContent = lines;

// 範例延伸
var output = '';
var cin = prompt('請輸入兩個數字（以逗號,分隔）：');
if(!cin){
    document.getElementById("output").textContent = '使用者無輸入內容';
}else{
    var parts = cin.split(",")
    var nums = [];
    nums.push(parseInt(parts[0]), parseInt(parts[1]));
    let sum = 0;
    sum = nums[0] + nums[1];
    output += '第一個數字：' + nums[0] + ', 第二個數字：' + nums[1] + '\n'
    output += nums[0] + " + " + nums[1] + ' = ' + sum
    document.getElementById("output").textContent = output;
}
