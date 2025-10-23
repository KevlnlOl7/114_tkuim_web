var bingo = Math.floor(Math.random() * 100 + 1)
var guess = prompt("來猜數字 ( 1 ~ 100 )！"+bingo);
var cnt = 1;
var lowerBoundary = 0, upperBoundary = 100;
while(guess != bingo){
    if(guess > bingo){
        upperBoundary = guess;
        guess = prompt("再小一點 ( "+lowerBoundary + " ~ " + upperBoundary + " )");
        while(guess >= upperBoundary){
            guess = prompt("就跟你說再小一點 ( "+lowerBoundary + " ~ " + upperBoundary + " ) 講不聽餒齁");
            // 面對文盲，我就不再加計數器的次數了
        }
        cnt++;
    }else if (guess < bingo){
        lowerBoundary = guess;
        guess = prompt("再大一點 ( "+lowerBoundary + " ~ " + upperBoundary + " )");
        while(guess <= lowerBoundary){
            guess = prompt("就跟你說再大一點 ( "+lowerBoundary + " ~ " + upperBoundary + " ) 講不聽餒齁");
        }
        cnt++;
    }
}
var text = '';
if (guess == bingo && cnt == 1){
    alert("一擊命中\n你今天別出門"); //希望使用者看到這句可以知道他一次就猜中了
    text = ("一擊命中\n你今天別出門");
}else if(guess == bingo && cnt > 1 && cnt <= 10 ){
    alert("你超屌！！恭喜你花了" + cnt + "次猜中！\n老鐵在直播間扣個 666" );
    text = ("你超屌！！恭喜你花了" + cnt + "次猜中！\n老鐵在直播間扣個 666" );
}else if (guess == bingo && cnt > 10 && cnt < 20){
    alert("還行啦 ~ 恭喜你花了" + cnt + "次猜中！" );
    text = ("還行啦 ~ 恭喜你花了" + cnt + "次猜中！" );
}else if (guess == bingo && cnt > 20){
    alert("你的運氣偏烙，但還是恭喜你花了" + cnt + "次猜中！" );
    text = ("你的運氣偏烙，但還是恭喜你花了" + cnt + "次猜中！" );
}

document.getElementById("result").textContent = text;