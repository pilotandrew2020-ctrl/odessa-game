// tests/t_hub.js
const path = require('path');

module.exports = {
  opts: { w: 900, h: 600 },
  async run(page, h) {
    const base = process.env.BASE || 'http://localhost:8765';

    // 1. Hub
    console.log('Testing games.html...');
    await page.goto(`${base}/games.html`);
    await page.waitForSelector('.tile');
    await page.screenshot({ path: path.join(h.SCR, 'hub_page.png') });

    // 2. 2048
    console.log('Testing games/2048.html...');
    await page.goto(`${base}/games/2048.html`);
    await page.waitForSelector('#board');
    const sc2048 = await page.evaluate(() => {
      window.move2048('down');
      window.move2048('right');
      window.move2048('down');
      window.move2048('left');
      return parseInt(document.getElementById('sc').textContent, 10);
    });
    console.log('2048 score after moves:', sc2048);
    await page.screenshot({ path: path.join(h.SCR, 'game_2048.png') });

    // 3. Snake
    console.log('Testing games/snake.html...');
    await page.goto(`${base}/games/snake.html`);
    await page.waitForSelector('#c');
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) window.snakeStep();
    });
    await page.screenshot({ path: path.join(h.SCR, 'game_snake.png') });

    // 4. Memory
    console.log('Testing games/memory.html...');
    await page.goto(`${base}/games/memory.html`);
    await page.waitForSelector('.card');
    const memRes = await page.evaluate(() => {
      const d = window.memoryDeck;
      let first = 0;
      let second = d.indexOf(d[0], 1);
      const cards = document.querySelectorAll('.card');
      cards[first].click();
      cards[second].click();
      return document.getElementById('sc').textContent;
    });
    console.log('Memory pairs matched:', memRes);
    if (memRes !== '1/8') throw new Error('Memory game card match failed');
    await page.screenshot({ path: path.join(h.SCR, 'game_memory.png') });

    // 5. Gull
    console.log('Testing games/gull.html...');
    await page.goto(`${base}/games/gull.html`);
    await page.waitForSelector('#c');
    await page.evaluate(() => {
      window.gullFlap();
    });
    await page.screenshot({ path: path.join(h.SCR, 'game_gull.png') });

    // 6. Quiz
    console.log('Testing games/quiz.html...');
    await page.goto(`${base}/games/quiz.html`);
    await page.waitForSelector('.ans-btn');
    const quizScore = await page.evaluate(() => {
      window.selectAnswerByIndex(0);
      return parseInt(document.getElementById('sc').textContent, 10);
    });
    console.log('Quiz score after correct answer:', quizScore);
    if (quizScore !== 10) throw new Error('Quiz first question score failed');
    await page.screenshot({ path: path.join(h.SCR, 'game_quiz.png') });

    console.log('Hub and all games tested cleanly.');
  }
};
