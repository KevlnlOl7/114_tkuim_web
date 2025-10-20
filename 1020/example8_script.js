// example8_script.js
// 宣告一個學生物件，包含屬性與方法

var student = {
  name: '小明',
  id: 'A123456789',
  scores: [85, 90, 78],
  getAverage: function() {
    var sum = 0;
    for (var i = 0; i < this.scores.length; i++) {
      sum += this.scores[i];
    }
    return sum / this.scores.length;
  },
  info: function() {
    return '姓名：' + this.name + '\n學號：' + this.id;
  },
  getGrade: function() {
    let score = this.getAverage().toFixed(1);
    var grade = '';
    switch(true){
        case(score >= 90):
            return "A";
        case(score >= 80):
            return "B";
        case(score >= 70):
            return "C";
        case(score >= 60):
            return "D";
        case(score < 60 && score >= 0):
            return "F";
        default:
            return "Invalid Score!";

    };
  }
};

var text = student.info() + '\n平均：' + student.getAverage().toFixed(2);
document.getElementById('result').textContent = text;


var grade = '';
grade += "成績等第：" + student.getGrade() + '\n';
document.getElementById('grade').textContent = grade;