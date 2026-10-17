/* ============================================================
   COMPONENTS.JS — Drawer, Nav Overlay, Modals, Case Study Carousel
   ============================================================ */

import { audio } from './audio.js';

// Humorous Presenter Notes for every slide
const PRESENTER_NOTES = {
  1: {
    title: 'Slide 1: Cover / Introduction',
    content: `<p><strong>Speaker Goal:</strong> Shock the room immediately. Do not apologize for not having a 50-slide deck.</p>
              <p>State clearly: "We sell thinking, not slide formatting."</p>
              <div class="notes-drawer__tip">💡 Tip: If someone asks for an executive summary, tell them this <i>is</i> the summary.</div>`,
  },
  2: {
    title: 'Slide 2: Acceptance',
    content: `<p><strong>Speaker Goal:</strong> Count how many people in the room wince in agreement.</p>
              <p>Billions wasted on frameworks nobody uses. Give a 3-second pause to let the reality sink in.</p>
              <div class="notes-drawer__tip">💡 Tip: Ask: "Who here has actually re-read a 70-page strategy deck this quarter?"</div>`,
  },
  3: {
    title: 'Slide 3: Our Philosophy',
    content: `<p><strong>Speaker Goal:</strong> Deadpan delivery of the 3 tenets.</p>
              <p>1. Best pitch = No pitch.<br/>2. Best deck = No deck.<br/>3. Best deal = Signed one.</p>
              <div class="notes-drawer__tip">💡 Tip: Lean in on "Signed one". Business is about revenue, not keynote acrobatics.</div>`,
  },
  4: {
    title: 'Slide 4: What We Actually Do',
    content: `<p><strong>Speaker Goal:</strong> Contrast clarity with consultant jargon.</p>
              <p>Point out the 4 pillars: Strategic Clarity, Pitch Elimination, Revenue Architecture, Workshop Demolition.</p>
              <div class="notes-drawer__tip">💡 Tip: Explain that "Workshop Demolition" means no more post-it notes on glass walls.</div>`,
  },
  5: {
    title: 'Slide 5: What We Do NOT Do',
    content: `<p><strong>Speaker Goal:</strong> Read the crossed-out list with solemn gravity.</p>
              <p>No strategy decks. No frameworks. No roadmaps. No 76-page PDFs.</p>
              <div class="notes-drawer__tip">💡 Tip: Mention that PDFs are where good ideas go to die peacefully in a Google Drive folder.</div>`,
  },
  6: {
    title: 'Slide 6: Who We Work With',
    content: `<p><strong>Speaker Goal:</strong> Qualification through exclusion.</p>
              <p>We work with founders, revenue teams, and product leaders who are done pretending.</p>
              <div class="notes-drawer__tip">💡 Tip: If they aren't ready to make decisions in real time, we aren't for them.</div>`,
  },
  7: {
    title: 'Slide 7: Technical Glitch / Easter Egg',
    content: `<p><strong>Speaker Goal:</strong> Act surprised when the MS-DOS screen appears.</p>
              <p>Pretend PowerPoint crashed while parsing a 200MB slide deck with embedded transitions.</p>
              <div class="notes-drawer__tip">💡 Tip: "See? Even computers can't handle another PowerPoint slide."</div>`,
  },
  8: {
    title: 'Slide 8: Case Studies',
    content: `<p><strong>Speaker Goal:</strong> Concrete numbers. Zero fluff.</p>
              <p>FinTech: $4M saved in one meeting.<br/>SaaS: $12M ARR closed with zero decks.<br/>Health: Series B closed with 1 whiteboard.</p>
              <div class="notes-drawer__tip">💡 Tip: Invite them to click "See Project" to view the detailed breakdowns.</div>`,
  },
  9: {
    title: 'Slide 9: Client Testimonial',
    content: `<p><strong>Speaker Goal:</strong> Let the quote do the talking.</p>
              <p>"We hired them to fix our pitch. They deleted it. Then we closed the biggest deal of the year."</p>
              <div class="notes-drawer__tip">💡 Tip: Don't rush past this slide. Confidence is silent.</div>`,
  },
  10: {
    title: 'Slide 10: Conclusion & Next Steps',
    content: `<p><strong>Speaker Goal:</strong> Close the loop. The recycling bin is waiting.</p>
              <p>Ask them: "Are we scheduling another presentation, or are we ready to sign?"</p>
              <div class="notes-drawer__tip">💡 Tip: Click "One more slide..." for the bonus secret content.</div>`,
  },
};

// Case Study details for modal
const CASE_STUDIES = {
  1: {
    title: 'FinTech: 1 Meeting. 1 Question. $4M Saved.',
    industry: 'Financial Technology / Enterprise Banking',
    content: `
      <p>A Series B FinTech was about to spend $4.2M and 14 months building a custom compliance orchestration engine for European expansion.</p>
      <div class="modal__metrics">
        <div class="modal__metric">
          <div class="modal__metric-val">$4.0M</div>
          <div class="modal__metric-lbl">Capital Saved</div>
        </div>
        <div class="modal__metric">
          <div class="modal__metric-val">1 Day</div>
          <div class="modal__metric-lbl">Decision Time</div>
        </div>
        <div class="modal__metric">
          <div class="modal__metric-val">0</div>
          <div class="modal__metric-lbl">Decks Produced</div>
        </div>
      </div>
      <p><strong>The Intervention:</strong> We cancelled their 80-slide architectural review. In a 45-minute conversation with the CTO and Head of Product, we asked one question: <em>"Which of these 18 features does the German regulator actually audit?"</em></p>
      <p>The answer was: exactly two. The remaining 16 were imaginary hedge bets. The project was rescoped on a single sheet of paper and shipped in 6 weeks.</p>
    `,
  },
  2: {
    title: 'SaaS: Zero Decks. 3 Contracts. $12M ARR.',
    industry: 'Enterprise B2B Infrastructure',
    content: `
      <p>An infrastructure software company was losing deals because their sales team subjected CIOs to 60-minute product slide presentations.</p>
      <div class="modal__metrics">
        <div class="modal__metric">
          <div class="modal__metric-val">$12M</div>
          <div class="modal__metric-lbl">New ARR</div>
        </div>
        <div class="modal__metric">
          <div class="modal__metric-val">42%</div>
          <div class="modal__metric-lbl">Shorter Sales Cycle</div>
        </div>
        <div class="modal__metric">
          <div class="modal__metric-val">100%</div>
          <div class="modal__metric-lbl">Deck-Free Demos</div>
        </div>
      </div>
      <p><strong>The Intervention:</strong> We banned PowerPoint in enterprise discovery calls. We trained account executives to ask three diagnostic questions and draft a 1-page financial impact model live with the prospect.</p>
      <p>Result: 3 Fortune 500 contracts signed within 90 days.</p>
    `,
  },
  3: {
    title: 'Health: No Slides. 1 Whiteboard. Series B Closed.',
    industry: 'Digital Health & Biotech',
    content: `
      <p>The founders had spent 3 months polishing a 42-slide pitch deck for institutional healthcare investors, resulting in polite passes.</p>
      <div class="modal__metrics">
        <div class="modal__metric">
          <div class="modal__metric-val">$28M</div>
          <div class="modal__metric-lbl">Series B Closed</div>
        </div>
        <div class="modal__metric">
          <div class="modal__metric-val">2 Weeks</div>
          <div class="modal__metric-lbl">From First Meeting</div>
        </div>
        <div class="modal__metric">
          <div class="modal__metric-val">2 Lead</div>
          <div class="modal__metric-lbl">Term Sheets</div>
        </div>
      </div>
      <p><strong>The Intervention:</strong> We threw away the slide deck. In the lead partner meeting, the CEO stood at a physical whiteboard and drew their unit economics, regulatory pathway, and clinical moat by hand.</p>
      <p>Two term sheets arrived within 10 business days.</p>
    `,
  },
};

// Slide metadata for Thumbnail Menu
const SLIDE_TITLES = [
  { no: 1, title: 'Cover / Anti-Deck', tag: 'Intro' },
  { no: 2, title: 'Acceptance', tag: 'Statement' },
  { no: 3, title: 'We Believe', tag: 'Manifesto' },
  { no: 4, title: 'What We Do', tag: 'Services' },
  { no: 5, title: 'What We Don’t Do', tag: 'Notepad' },
  { no: 6, title: 'Who We Work With', tag: 'Audience' },
  { no: 7, title: 'MS-DOS Error', tag: 'Easter Egg' },
  { no: 8, title: 'Case Studies', tag: 'Proof' },
  { no: 9, title: 'Client Testimonial', tag: 'Quote' },
  { no: 10, title: 'Leave in the Bin', tag: 'Action' },
];

export class UIController {
  constructor(slideController) {
    this.slides = slideController;
    this.notesDrawer = document.getElementById('notes-drawer');
    this.notesToggle = document.getElementById('notes-toggle');
    this.notesContent = document.getElementById('notes-content');
    this.navOverlay = document.getElementById('nav-overlay');
    this.navMenu = document.getElementById('nav-menu');
    this.modalOverlay = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.modalClose = document.getElementById('modal-close');
    this.sfxToggle = document.getElementById('sfx-toggle');
    this.sfxIconOn = document.getElementById('sfx-icon-on');
    this.sfxIconOff = document.getElementById('sfx-icon-off');

    // Case Study Carousel state
    this.currentProject = 1;

    this.init();
  }

  init() {
    this.setupNotesDrawer();
    this.setupNavOverlay();
    this.setupModals();
    this.setupCaseStudyCarousel();
    this.setupSFXToggle();
    this.setupSlide10EasterEgg();
    this.setupFooterLinks();
  }

  // --- PRESENTER NOTES ---
  setupNotesDrawer() {
    if (!this.notesToggle || !this.notesDrawer) return;

    this.notesToggle.addEventListener('click', () => {
      audio.playClick();
      const isOpen = this.notesDrawer.classList.toggle('is-open');
      this.notesToggle.classList.toggle('is-active', isOpen);
    });

    this.updateNotes(1);
  }

  updateNotes(slideIndex) {
    if (!this.notesContent) return;
    const note = PRESENTER_NOTES[slideIndex] || {
      title: `Slide ${slideIndex}`,
      content: '<p>No specific notes for this slide.</p>',
    };

    this.notesContent.innerHTML = `
      <div class="notes-drawer__header">
        <h4 class="notes-drawer__title">
          <span>📝</span> ${note.title}
        </h4>
        <span class="notes-drawer__badge">CONFIDENTIAL</span>
      </div>
      <div>${note.content}</div>
    `;
  }

  // --- NAVIGATION OVERLAY (THUMBNAILS) ---
  setupNavOverlay() {
    if (!this.navMenu || !this.navOverlay) return;

    const grid = document.getElementById('nav-overlay-grid');
    if (grid) {
      grid.innerHTML = SLIDE_TITLES.map(
        (slide) => `
        <div class="nav-overlay__thumb ${slide.no === 1 ? 'is-active' : ''}" data-slide-target="${slide.no}">
          <div class="nav-overlay__thumb-top">
            <span class="nav-overlay__thumb-no">${slide.no}</span>
            <span class="nav-overlay__thumb-tag">${slide.tag}</span>
          </div>
          <div class="nav-overlay__thumb-title">${slide.title}</div>
        </div>
      `
      ).join('');

      grid.querySelectorAll('.nav-overlay__thumb').forEach((thumb) => {
        thumb.addEventListener('click', (e) => {
          const target = parseInt(thumb.dataset.slideTarget, 10);
          audio.playClick();
          this.closeNavOverlay();
          this.slides.goToSlide(target);
        });
      });
    }

    this.navMenu.addEventListener('click', () => {
      audio.playClick();
      this.openNavOverlay();
    });

    this.navOverlay.addEventListener('click', (e) => {
      if (e.target === this.navOverlay) {
        audio.playClick();
        this.closeNavOverlay();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeNavOverlay();
        this.closeModal();
      } else if (e.key === 'm' || e.key === 'M') {
        if (this.navOverlay.classList.contains('is-open')) {
          this.closeNavOverlay();
        } else {
          this.openNavOverlay();
        }
      } else if (e.key === 'n' || e.key === 'N') {
        this.notesDrawer.classList.toggle('is-open');
        this.notesToggle.classList.toggle('is-active', this.notesDrawer.classList.contains('is-open'));
      }
    });
  }

  openNavOverlay() {
    this.navOverlay.classList.add('is-open');
    this.updateActiveThumbnail(this.slides.currentIndex);
  }

  closeNavOverlay() {
    this.navOverlay.classList.remove('is-open');
  }

  updateActiveThumbnail(currentIndex) {
    const thumbs = document.querySelectorAll('.nav-overlay__thumb');
    thumbs.forEach((th) => {
      const slideNo = parseInt(th.dataset.slideTarget, 10);
      th.classList.toggle('is-active', slideNo === currentIndex);
    });
  }

  // --- MODALS ---
  setupModals() {
    if (!this.modalClose || !this.modalOverlay) return;

    this.modalClose.addEventListener('click', () => {
      audio.playClick();
      this.closeModal();
    });

    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        audio.playClick();
        this.closeModal();
      }
    });
  }

  openModal(htmlContent) {
    if (!this.modalContent || !this.modalOverlay) return;
    this.modalContent.innerHTML = htmlContent;
    this.modalOverlay.classList.add('is-open');
  }

  closeModal() {
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('is-open');
    }
  }

  // --- CASE STUDIES CAROUSEL (Slide 8) ---
  setupCaseStudyCarousel() {
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const cards = document.querySelectorAll('.project-card');

    const updateCards = () => {
      cards.forEach((card) => {
        const pId = parseInt(card.dataset.project, 10);
        card.classList.remove('is-active', 'is-prev', 'is-next');

        if (pId === this.currentProject) {
          card.classList.add('is-active');
        } else if (pId === ((this.currentProject - 2 + 3) % 3) + 1) {
          card.classList.add('is-prev');
        } else {
          card.classList.add('is-next');
        }
      });
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        audio.playPaper();
        this.currentProject = this.currentProject === 1 ? 3 : this.currentProject - 1;
        updateCards();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        audio.playPaper();
        this.currentProject = this.currentProject === 3 ? 1 : this.currentProject + 1;
        updateCards();
      });
    }

    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const pId = parseInt(card.dataset.project, 10);
        if (pId !== this.currentProject) {
          audio.playPaper();
          this.currentProject = pId;
          updateCards();
        } else {
          // Open Case Study Modal
          const data = CASE_STUDIES[pId];
          if (data) {
            audio.playClick();
            this.openModal(`
              <h2>${data.title}</h2>
              <div class="project-card__industry">${data.industry}</div>
              <div style="margin-top: 1rem;">${data.content}</div>
            `);
          }
        }
      });
    });

    updateCards();
  }

  // --- SFX TOGGLE ---
  setupSFXToggle() {
    if (!this.sfxToggle) return;

    this.sfxToggle.addEventListener('click', () => {
      const isMuted = audio.toggleMute();
      this.sfxToggle.classList.toggle('is-muted', isMuted);
      if (this.sfxIconOn && this.sfxIconOff) {
        this.sfxIconOn.style.display = isMuted ? 'none' : 'block';
        this.sfxIconOff.style.display = isMuted ? 'block' : 'none';
      }
      if (!isMuted) audio.playClick();
    });
  }

  // --- SLIDE 10 BONUS CTA EASTER EGG ---
  setupSlide10EasterEgg() {
    const endCta = document.getElementById('end-cta');
    if (!endCta) return;

    endCta.addEventListener('click', () => {
      audio.playClick();
      this.openModal(`
        <h2>🎁 BONUS SLIDE 11: THE ANTI-PRESENTATION MANIFESTO</h2>
        <div style="margin-top: 1rem; line-height: 1.6;">
          <p>Congratulations, you found the hidden bonus slide!</p>
          <div style="background: var(--color-lime); border: var(--border-medium); border-radius: var(--radius-md); padding: 1.2rem; margin: 1rem 0; box-shadow: var(--shadow-md);">
            <h3 style="font-family: var(--font-display); margin-bottom: 0.5rem;">THE GOLDEN RULE OF CLOSING:</h3>
            <p style="font-size: 1.15rem; font-weight: bold; margin: 0;">"The amount of slides in your deck is inversely proportional to your confidence in the product."</p>
          </div>
          <p>Every time you feel the urge to open PowerPoint, Keynote, or Google Slides — ask yourself:</p>
          <ol style="list-style: decimal; padding-left: 1.5rem; margin-bottom: 1rem;">
            <li>Can this be explained in a 10-minute whiteboard drawing?</li>
            <li>Can we solve their problem in the room right now?</li>
            <li>Would they rather watch 40 slides or look at a real contract?</li>
          </ol>
          <p>Ready to build experiences like this? Keep creating websites that break conventions.</p>
        </div>
      `);
    });
  }

  // --- CREDITS & LEGAL MODALS ---
  setupFooterLinks() {
    const creditsBtn = document.getElementById('credits-btn');
    const legalBtn = document.getElementById('legal-btn');

    if (creditsBtn) {
      creditsBtn.addEventListener('click', () => {
        audio.playClick();
        this.openModal(`
          <h2>🌟 CREDITS & INSPIRATION</h2>
          <div style="margin-top: 1rem; line-height: 1.6;">
            <p><strong>Original Concept & Inspiration:</strong> <a href="https://www.nodeck.online/" target="_blank" style="text-decoration: underline; font-weight: bold;">OhMyDeck.online</a> by <strong>Bogdan Kolomiyets</strong>.</p>
            <p><strong>Replication Architecture:</strong> Custom slide transition engine, Web Audio API procedural sound synthesizer, GSAP timeline animations, responsive neo-brutalist bento grid, interactive MS-DOS BIOS terminal simulation, and tactile physical stationery props.</p>
            <p><strong>Fonts:</strong> Bungee & DM Sans (Google Fonts), IBM Plex Mono.</p>
            <p><strong>Aesthetic:</strong> Neo-brutalist comic book style with acid lime (#DEF915), hot pink (#FF87AB), paper cream (#F3E6D6), and heavy ink borders.</p>
          </div>
        `);
      });
    }

    if (legalBtn) {
      legalBtn.addEventListener('click', () => {
        audio.playClick();
        this.openModal(`
          <h2>⚖️ LEGAL & DISCLAIMER</h2>
          <div style="margin-top: 1rem; line-height: 1.6;">
            <p>This project is a high-fidelity educational and architectural demonstration of interactive web storytelling and anti-presentation UI/UX design patterns.</p>
            <p>All brand names and fictional case studies mentioned are parodies designed to showcase interactive web animation techniques.</p>
            <p>© 2026 NOPITCH / OHMYDECK Interactive Experiment.</p>
          </div>
        `);
      });
    }
  }
}
