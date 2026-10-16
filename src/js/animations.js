/* ============================================================
   ANIMATIONS.JS — GSAP Animation Sequences, Text Splitting & BIOS
   ============================================================ */

import gsap from 'gsap';
import { audio } from './audio.js';

let biosTypingInterval = null;

// Split text into words and chars for stagger animations
// Split text nodes into spans for stagger animations while preserving inner tags
export function initSplitText() {
  const elements = document.querySelectorAll('[data-split]');
  elements.forEach((el) => {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = 'true';

    const type = el.getAttribute('data-split'); // 'heading' or 'description'
    splitNodeRecursively(el, type);

    // Make visible after splitting
    el.style.visibility = 'visible';
  });
}

function splitNodeRecursively(node, type) {
  const childNodes = Array.from(node.childNodes);

  childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;
      if (!text || text.trim() === '') return;

      const words = text.split(/(\s+)/);
      const frag = document.createDocumentFragment();

      words.forEach((word) => {
        if (/^\s+$/.test(word)) {
          frag.appendChild(document.createTextNode(word));
        } else if (type === 'heading') {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'split-word';
          word.split('').forEach((char) => {
            const charSpan = document.createElement('span');
            charSpan.className = 'split-char';
            charSpan.textContent = char;
            wordSpan.appendChild(charSpan);
          });
          frag.appendChild(wordSpan);
        } else {
          const wordSpan = document.createElement('span');
          wordSpan.className = 'split-word';
          wordSpan.textContent = word;
          frag.appendChild(wordSpan);
        }
      });

      node.replaceChild(frag, child);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      splitNodeRecursively(child, type);
    }
  });
}

// Master slide entrance animator
export function animateSlideEntrance(slideEl, slideIndex) {
  if (!slideEl) return;

  // Clear any existing slide tweens
  gsap.killTweensOf(slideEl.querySelectorAll('*'));

  // Reset BIOS if leaving or entering
  if (biosTypingInterval) {
    clearInterval(biosTypingInterval);
    biosTypingInterval = null;
  }

  // Common text stagger
  const splitChars = slideEl.querySelectorAll('.split-char');
  const splitWords = slideEl.querySelectorAll('.split-word');

  if (splitChars.length > 0) {
    gsap.fromTo(
      splitChars,
      { opacity: 0, y: 35, rotateZ: 4 },
      {
        opacity: 1,
        y: 0,
        rotateZ: 0,
        stagger: 0.015,
        duration: 0.6,
        ease: 'power3.out',
      }
    );
  } else if (splitWords.length > 0) {
    gsap.fromTo(
      splitWords,
      { opacity: 0, y: 25 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.03,
        duration: 0.5,
        ease: 'power2.out',
      }
    );
  }

  // Slide specific sequences
  switch (slideIndex) {
    case 1: {
      // Cover Logo & Props
      const heroLogo = slideEl.querySelector('.slide__hero-logo');
      const noteProp = slideEl.querySelector('.slide__prop--note');
      const penProp = slideEl.querySelector('.slide__prop--highlighter');

      if (heroLogo) {
        gsap.fromTo(
          heroLogo,
          { scale: 0.7, opacity: 0, y: 40 },
          { scale: 1, opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.8)', delay: 0.1 }
        );
      }
      if (noteProp) {
        gsap.fromTo(
          noteProp,
          { x: -100, y: -60, opacity: 0, rotate: -30 },
          { x: 0, y: 0, opacity: 1, rotate: -12, duration: 0.9, ease: 'power3.out', delay: 0.2 }
        );
      }
      if (penProp) {
        gsap.fromTo(
          penProp,
          { x: 120, y: -80, opacity: 0, rotate: 60 },
          { x: 0, y: 0, opacity: 1, rotate: 32, duration: 1, ease: 'power3.out', delay: 0.3 }
        );
      }
      break;
    }

    case 2: {
      // Problem Eraser & Highlighter stroke
      const eraser = slideEl.querySelector('.slide__prop--eraser');
      const stroke = slideEl.querySelector('.highlighter-stroke path');

      if (eraser) {
        gsap.fromTo(
          eraser,
          { y: -100, opacity: 0, rotate: -45 },
          { y: 0, opacity: 1, rotate: -18, duration: 0.7, ease: 'bounce.out', delay: 0.2 }
        );
      }
      if (stroke) {
        setTimeout(() => audio.playMarker(), 400);
      }
      break;
    }

    case 4: {
      // Bento Cards Pop-in
      const cards = slideEl.querySelectorAll('.bento-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 50, opacity: 0, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.1,
            duration: 0.6,
            ease: 'back.out(1.4)',
            delay: 0.15,
          }
        );
      }
      break;
    }

    case 5: {
      // Pinned Notepad Entrance & Strike animation
      const notepad = slideEl.querySelector('.notepad');
      const items = slideEl.querySelectorAll('.notepad__list li');

      if (notepad) {
        gsap.fromTo(
          notepad,
          { scale: 0.85, opacity: 0, rotate: -6 },
          { scale: 1, opacity: 1, rotate: 1.5, duration: 0.7, ease: 'back.out(1.6)' }
        );
      }
      if (items.length > 0) {
        gsap.fromTo(
          items,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, stagger: 0.12, duration: 0.5, delay: 0.3 }
        );
      }
      break;
    }

    case 6: {
      // Audience Cards Stagger
      const cards = slideEl.querySelectorAll('.audience-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 40, opacity: 0, rotate: -3 },
          { y: 0, opacity: 1, rotate: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out', delay: 0.2 }
        );
      }
      break;
    }

    case 7: {
      // BIOS Error Screen Typewriter Simulation
      startBiosTerminal();
      break;
    }

    case 8: {
      // Case Study Cards
      const cards = slideEl.querySelectorAll('.project-card');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' }
        );
      }
      break;
    }

    case 10: {
      // Trash Bin and CTA
      const trash = slideEl.querySelector('.trashbin');
      const cta = slideEl.querySelector('.end-cta');

      if (trash) {
        gsap.fromTo(
          trash,
          { y: 60, opacity: 0, scale: 0.9 },
          { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.5)', delay: 0.2 }
        );
      }
      if (cta) {
        gsap.fromTo(
          cta,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)', delay: 0.4 }
        );
      }
      break;
    }
  }
}

// BIOS DOS Terminal Typewriter effect for Slide 7
function startBiosTerminal() {
  const biosContent = document.getElementById('bios-content');
  if (!biosContent) return;

  audio.playStartup();

  const lines = [
    'ROM BIOS (C) 2026 NODECK SYSTEMS CORP.',
    'CPU: PENTIUM-II @ 350MHz | RAM CHECK: 640KB BASE OK, 64MB EXTENDED OK',
    'DETECTING DRIVES: C: FAT32 [PRIMARY], D: SLIDE_STORAGE [READY]',
    'INITIALIZING SLIDE STACK ENGINE v4.20...',
    '----------------------------------------------------------------',
    'CRITICAL SYSTEM EXCEPTION (0x000000DECK): PPTX_PARSE_FAILED',
    'ATTEMPTING TO LOAD: No_Decks_Final_FINAL_v4_REAL_final.pptx',
    'STATUS: FILE CORRUPTED BY REDUNDANT BULLET POINTS.',
    '',
    '*** STOP: 0x0000000A (0x00000000, 0x00000002, 0x00000000, 0x804D7E2B)',
    '*** PPTX_STACK_OVERFLOW in module PRESENTATION.SYS',
    '',
    'DIAGNOSTIC ADVICE:',
    '1. Discard the 76-page slide deck immediately.',
    '2. Focus on strategic conversation instead.',
    '3. Press [NEXT] or SPACE to recover system sanity.',
  ];

  biosContent.innerHTML = '';
  let lineIndex = 0;
  let charIndex = 0;
  let currentP = document.createElement('div');
  biosContent.appendChild(currentP);

  biosTypingInterval = setInterval(() => {
    if (lineIndex >= lines.length) {
      clearInterval(biosTypingInterval);
      biosTypingInterval = null;
      return;
    }

    const currentLine = lines[lineIndex];

    if (charIndex < currentLine.length) {
      currentP.textContent += currentLine[charIndex];
      charIndex++;
      if (Math.random() > 0.4) {
        audio.playTypewriter();
      }
    } else {
      lineIndex++;
      charIndex = 0;
      if (lineIndex < lines.length) {
        currentP = document.createElement('div');
        const nextLine = lines[lineIndex];
        if (nextLine.includes('CRITICAL') || nextLine.includes('STOP') || nextLine.includes('PPTX_STACK_OVERFLOW')) {
          currentP.className = 'bios-line--error';
        } else if (nextLine.includes('DIAGNOSTIC ADVICE') || nextLine.includes('Press [NEXT]')) {
          currentP.className = 'bios-line--highlight';
        }
        biosContent.appendChild(currentP);
      }
    }
  }, 22);
}
