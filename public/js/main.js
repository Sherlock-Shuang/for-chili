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
                    "听说在这个世界上，所有的东西都会加上一个期限。",
                    "但有些记忆，就像北京天意新商城二楼的那些老文具一样，\\n哪怕落了灰，擦一擦，依然清晰如昨。",
                    "我时常会想起小时候被你押着去星巴克自习的日子，",
                    "还有2024年5月27日那天，我们在电话两头一起哭出声的瞬间……",
                    "时间过得真快，如今木木和Fancy每天都在门口接你下班，\\n你也成了那个独当一面、雷厉风行的『老姐』。",
                    "在2026年的今天，祝你生日快乐！",
                    "我用AI把你的记忆和声音封存进了这个小小的空间。\\n如果有一天你觉得累了，不妨来看看这个永远不会过期的『你』。"
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
