/* ============================================================
   SLIDES.JS — Core Slide Engine, Transitions, and Navigation
   ============================================================ */

import gsap from 'gsap';
import { audio } from './audio.js';
import { animateSlideEntrance } from './animations.js';

export class SlideController {
  constructor() {
    this.currentIndex = 1;
    this.totalSlides = 10;
    this.isTransitioning = false;
    this.uiController = null; // Injected after UI init

    this.slidesContainer = document.getElementById('slides-container');
    this.slides = Array.from(document.querySelectorAll('.slide'));
    this.counterEl = document.getElementById('slide-counter');
    this.prevBtn = document.getElementById('nav-prev');
    this.nextBtn = document.getElementById('nav-next');
    this.logoHomeBtn = document.getElementById('logo-home-btn');
    this.transitionBg = document.getElementById('slide-transition-bg');
    this.transitionLabel = document.getElementById('slide-transition-label');

    this.init();
  }

  setUIController(ui) {
    this.uiController = ui;
  }

  init() {
    this.updateControls();
    this.setupListeners();
    // Entrance for initial slide 1
    const slide1 = document.querySelector('.slide[data-slide="1"]');
    if (slide1) {
      animateSlideEntrance(slide1, 1);
    }
  }

  setupListeners() {
    // Nav Prev / Next buttons
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => {
        this.prevSlide();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => {
        this.nextSlide();
      });
    }

    // Top logo click -> return to Cover slide
    if (this.logoHomeBtn) {
      this.logoHomeBtn.addEventListener('click', () => {
        audio.playClick();
        this.goToSlide(1);
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Don't intercept if an input is focused or modal is open
      const modalOpen = document.querySelector('.modal-overlay.is-open');
      const navOpen = document.querySelector('.nav-overlay.is-open');
      if (modalOpen || navOpen) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          this.nextSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          this.prevSlide();
          break;
        case ' ': // Spacebar
          e.preventDefault();
          this.nextSlide();
          break;
        case 'Home':
          e.preventDefault();
          this.goToSlide(1);
          break;
        case 'End':
          e.preventDefault();
          this.goToSlide(this.totalSlides);
          break;
      }
    });

    // Touch swipe navigation
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      },
      { passive: true }
    );

    document.addEventListener(
      'touchend',
      (e) => {
        const touchEndX = e.changedTouches[0].screenX;
        const touchEndY = e.changedTouches[0].screenY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // If swipe is mostly horizontal and passes threshold
        if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
          if (deltaX < 0) {
            this.nextSlide();
          } else {
            this.prevSlide();
          }
        }
      },
      { passive: true }
    );

    // Mouse wheel navigation with debounce
    let wheelTimeout = null;
    document.addEventListener(
      'wheel',
      (e) => {
        const modalOpen = document.querySelector('.modal-overlay.is-open');
        const navOpen = document.querySelector('.nav-overlay.is-open');
        const notesOpen = document.querySelector('.notes-drawer.is-open');
        if (modalOpen || navOpen || notesOpen) return;

        if (wheelTimeout) return;

        if (Math.abs(e.deltaY) > 35) {
          if (e.deltaY > 0) {
            this.nextSlide();
          } else {
            this.prevSlide();
          }

          wheelTimeout = setTimeout(() => {
            wheelTimeout = null;
          }, 800);
        }
      },
      { passive: true }
    );
  }

  nextSlide() {
    if (this.currentIndex < this.totalSlides) {
      this.goToSlide(this.currentIndex + 1);
    }
  }

  prevSlide() {
    if (this.currentIndex > 1) {
      this.goToSlide(this.currentIndex - 1);
    }
  }

  goToSlide(targetIndex) {
    if (
      targetIndex === this.currentIndex ||
      targetIndex < 1 ||
      targetIndex > this.totalSlides ||
      this.isTransitioning
    ) {
      return;
    }

    this.isTransitioning = true;
    const direction = targetIndex > this.currentIndex ? 1 : -1;
    const currentSlide = document.querySelector(`.slide[data-slide="${this.currentIndex}"]`);
    const nextSlide = document.querySelector(`.slide[data-slide="${targetIndex}"]`);

    if (!nextSlide) {
      this.isTransitioning = false;
      return;
    }

    audio.playWhoosh();

    const targetBg = nextSlide.dataset.bg || '#F3E6D6';
    const slideLabels = [
      '',
      'COVER // NO DECKS',
      'ACCEPTANCE',
      'OUR PHILOSOPHY',
      'WHAT WE DO',
      'WHAT WE DON’T DO',
      'WHO WE WORK WITH',
      'SYSTEM EXCEPTION',
      'CASE STUDIES',
      'TESTIMONIALS',
      'BIN THE DECKS',
    ];

    // Slide transition timeline with colored curtain
    const tl = gsap.timeline({
      onComplete: () => {
        this.isTransitioning = false;
        animateSlideEntrance(nextSlide, targetIndex);
      },
    });

    if (this.transitionBg) {
      this.transitionBg.style.backgroundColor = targetBg === '#000000' ? '#111111' : targetBg;

      if (this.transitionLabel) {
        this.transitionLabel.textContent = slideLabels[targetIndex] || `SLIDE ${targetIndex}`;
        this.transitionLabel.style.color = targetBg === '#000000' ? '#00FF66' : '#000000';
      }

      // Curtain sweep in
      tl.set(this.transitionBg, {
        scaleX: 0,
        visibility: 'visible',
        transformOrigin: direction > 0 ? 'left center' : 'right center',
      })
        .to(this.transitionBg, {
          scaleX: 1,
          duration: 0.32,
          ease: 'power2.inOut',
        })
        .call(() => {
          // Mid-transition swap
          if (currentSlide) currentSlide.classList.remove('is-active');
          nextSlide.classList.add('is-active');

          this.currentIndex = targetIndex;
          this.updateControls();

          document.body.style.backgroundColor = targetBg;
          document.documentElement.style.backgroundColor = targetBg;

          if (this.uiController) {
            this.uiController.updateNotes(targetIndex);
            this.uiController.updateActiveThumbnail(targetIndex);
          }
        })
        .to(this.transitionBg, {
          scaleX: 0,
          duration: 0.32,
          ease: 'power2.inOut',
          transformOrigin: direction > 0 ? 'right center' : 'left center',
        })
        .set(this.transitionBg, { visibility: 'hidden' });
    } else {
      // Fallback if no transitionBg element
      if (currentSlide) currentSlide.classList.remove('is-active');
      nextSlide.classList.add('is-active');
      this.currentIndex = targetIndex;
      this.updateControls();
      this.isTransitioning = false;
    }
  }

  updateControls() {
    // Update counter
    if (this.counterEl) {
      this.counterEl.textContent = `Slide ${this.currentIndex}/${this.totalSlides}`;
    }

    // Update buttons
    if (this.prevBtn) {
      this.prevBtn.disabled = this.currentIndex === 1;
    }
    if (this.nextBtn) {
      this.nextBtn.disabled = this.currentIndex === this.totalSlides;
    }

    // Top logo: hidden on Slide 1, visible on slides 2..10
    if (this.logoHomeBtn) {
      if (this.currentIndex === 1) {
        this.logoHomeBtn.style.opacity = '0';
        this.logoHomeBtn.style.pointerEvents = 'none';
      } else {
        this.logoHomeBtn.style.opacity = '1';
        this.logoHomeBtn.style.pointerEvents = 'auto';
      }
    }
  }
}
