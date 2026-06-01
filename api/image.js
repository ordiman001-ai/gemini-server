/* Тренер сам генерирует картинку в особый момент (много задач, активность и т.п.) */
function coachImageMoment(reason, extraContext){
 if(!state.allowImages||(!state.apiKey&&!state.proxyUrl))return;

 // 1. Жёсткий запрет текста на АНГЛИЙСКОМ (нейросети так понимают лучше всего)
 const noText = ", photorealistic, cinematic lighting, highly detailed. STRICTLY NO TEXT, no words, no letters, no watermarks, textless, blank background.";

 // 2. Библиотека разных сцен (чтобы картинки не повторялись)
 const promptsLib = {
  tasks: [
   'A person standing on top of a mountain watching sunrise, epic landscape, motivation, success' + noText,
   'A glowing golden trophy on a desk, achievement, progress' + noText,
   'A person running forward on an empty road, sunny morning, determination, active lifestyle' + noText,
   'A glowing abstract symbol of energy and power, neon lights, futuristic, success' + noText,
   'A blooming tree on a sunny hill, growth, positive energy, bright colors' + noText
  ],
  workout: [
   'A powerful athlete resting after a heavy workout, dark cinematic gym lighting, sweat, determination' + noText,
   'A close up of a heavy kettlebell on the floor, epic lighting, fitness, strength' + noText,
   'A person raising hands in victory on a mountain peak, bright sun, fitness success' + noText
  ],
  date: [
   'A romantic candlelit dinner table for two, cozy atmosphere, warm glowing light, elegant' + noText,
   'Two coffee cups on a table near a rainy window, cozy cafe, warm aesthetic, romantic' + noText,
   'A beautiful sunset over a calm sea, romantic vibe, warm colors, peaceful' + noText
  ]
 };

 // 3. Определяем, что рисовать (конкретный контекст или случайную сцену)
 let finalPrompt = '';
 if (extraContext) {
    // Если передали точные детали (например, со свидания)
    finalPrompt = 'Atmospheric beautiful scene: ' + extraContext + noText;
 } else {
    // Иначе берем случайную из списка
    const arr = promptsLib[reason] || promptsLib.tasks;
    finalPrompt = arr[Math.floor(Math.random() * arr.length)];
 }

 const note={
  tasks:{ru:'Горжусь твоим прогрессом — держи картинку силы! 🔥',en:"Proud of your progress — here's a power image! 🔥",zh:'为你的进步骄傲——送你一张力量图！🔥'},
  workout:{ru:'Ты заслужил это! 💪',en:'You earned this! 💪',zh:'这是你应得的！💪'},
  date:{ru:'На память об этом вечере 💝',en:'A memory of this evening 💝',zh:'纪念这个夜晚 💝'},
 };
 const l=state.lang||'ru';
 generateImage(finalPrompt, (note[reason]||note.tasks)[l], state.coach);
}
