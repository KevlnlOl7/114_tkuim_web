function transformer(unit, degree){
    // 填入所輸入的溫度以及其單位，例如我要將攝氏25度轉華氏
    // 就填transformer(c, 25) or transformer(C, 25)
    unit = unit.trim().toLowerCase(); // 把空白去掉，並轉換成小寫
    var msg = '';
    degree = Number(degree);
    switch(unit){
        case 'c': //要注意它是字串
            msg += '攝氏：' + degree + '\n轉換為華氏後為：' + ((9 / 5) * degree + 32).toFixed(2);
            break;
        case 'f':
            msg += '華氏：' + degree + '\n轉換為攝氏後為：' + ((5 / 9) * (degree - 32)).toFixed(2);
            break;
        default:
            msg = '請輸入正確的單位（C 或 F）';
    };
    return msg;
}

var unit = prompt("請輸入欲轉換單位\n若想攝氏轉華氏請填入 C\n若想華氏轉攝氏則請填入 F ");
var degree = prompt("請輸入溫度");
var text = '';
if(!unit && !degree){
    text = '請輸入溫度以及單位！'
}else if (!unit){
    text = '請輸入溫度單位！';
}else if (isNaN(degree)){
    text = '請輸入數字！';
}else{
    text = transformer(unit, degree)
}

ㄊdocument.getElementById("result").textContent = text
