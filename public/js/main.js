import { ui } from './ui.js';
import { setupEventListeners, loadInitialState } from './event.js';

document.addEventListener('DOMContentLoaded', async () => {
    ui.init();

    // 首次进入王家卫过场动画判断
    const hasSeenIntro = localStorage.getItem('gemini_intro_played');
    if (!hasSeenIntro) {
        document.getElementById('cinematic-overlay').style.display = 'flex';

        // 浏览器通常禁止未经用户交互的隐式自动播放，因此添加一个点击触发层
        const enterScreen = document.createElement('div');
        enterScreen.id = 'enter-screen';
        enterScreen.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;background:#000;display:flex;justify-content:center;align-items:center;color:#fff;cursor:pointer;';
        enterScreen.innerHTML = '<div style="font-family:\'Songti SC\', serif; font-size:18px; letter-spacing:8px; animation: blink 2s infinite;">点击开启回忆</div>';
        document.body.appendChild(enterScreen);

        await new Promise(resolve => {
            enterScreen.addEventListener('click', async () => {
                enterScreen.remove();

                // 开始沉浸式播放音乐
                const themeAudio = new Audio('/californiadreaming.mp3');
                themeAudio.volume = 1;
                themeAudio.play().catch(e => console.warn("音频播放失败", e));

                const introPhrases = [
                    "不知道从什么时候开始，在什么东西上面都有个日期……",
                    "秋刀鱼会过期，肉酱也会过期，连保鲜纸都会过期。\n我开始怀疑，在这个世界上，还有什么东西是不会过期的",
                    "在2026年4月18号，你会收到一句生日快乐。还有一份礼物，承载着很多的记忆。",
                    "然而，如果记忆是一个罐头的话，我希望这一罐罐头不会过期；",
                    "我曾经赋予自己左右过去的特权，\n我的写作就像是不断地拿起电话，\n然后不断地拨出一个个没有顺序的日期，\n去倾听电话另一端往事的发言。————余华",
                    "回忆的动人之处在于可以重新选择，\n将那些毫无关联的往事重新组合起来，从而获得全新的过去。————余华",
                    "So we beat on ,boats against the current,born back ceaselessly into the past"
                ];
                // 阻塞式的播放动画
                await ui.playIntroSequence(introPhrases);

                // 动画播放完毕，音乐平滑淡出
                ui.fadeOutAudio(themeAudio, 3000);

                localStorage.setItem('gemini_intro_played', 'true');
                resolve();
            });
        });
    }

    setupEventListeners();
    loadInitialState();
});
