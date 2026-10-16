/* ============================================================
   MAIN.JS — Application Entry Point & Orchestrator
   ============================================================ */

import { initSplitText } from './animations.js';
import { SlideController } from './slides.js';
import { UIController } from './components.js';
import { audio } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Reveal Status Bar and split text once JS engine loads
  const statusbar = document.getElementById('statusbar');
  if (statusbar) {
    statusbar.style.visibility = 'visible';
  }

  // 2. Split headings & descriptions for GSAP character/word staggers
  initSplitText();

  // 3. Initialize Core Slide Controller & UI
  const slideController = new SlideController();
  const uiController = new UIController(slideController);
  slideController.setUIController(uiController);

  // 4. Global audio trigger for interactive elements
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-sfx="click"]');
    if (target) {
      audio.playClick();
    }
  });

  // 5. Stylized Console Welcome
  console.log(
    '%c NODECK / NOPITCH %c Anti-Presentation Engine Initialized 🚀 ',
    'background: #FF87AB; color: #000; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 4px 0 0 4px;',
    'background: #DEF915; color: #000; font-weight: bold; font-size: 14px; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
  console.log(
    '%cKeyboard Shortcuts: %c[ArrowRight / Space] = Next | [ArrowLeft] = Prev | [M] = Menu | [N] = Presenter Notes | [Home/End] = Jump',
    'color: #888; font-weight: bold;',
    'color: #000;'
  );
});
