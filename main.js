/**
 * 固定ヘッダーのスクロール状態
 */
function setupStickyHeader() {
  const siteHeader = document.querySelector('.site-header');

  if (!siteHeader) return;

  let isTicking = false;

  const updateHeaderState = () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 30);
    isTicking = false;
  };

  const requestHeaderUpdate = () => {
    if (isTicking) return;

    isTicking = true;
    requestAnimationFrame(updateHeaderState);
  };

  updateHeaderState();
  window.addEventListener('scroll', requestHeaderUpdate, { passive: true });
}

/**
 * モバイルメニュー
 */
function setupMobileMenu() {
  const menuButton = document.querySelector('.menu-button');
  const globalNavigation = document.querySelector('.global-nav');

  if (!menuButton || !globalNavigation) return;

  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'メニューを開く');
    globalNavigation.classList.remove('is-open');
    document.body.classList.remove('is-menu-open');
  };

  const openMenu = () => {
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'メニューを閉じる');
    globalNavigation.classList.add('is-open');
    document.body.classList.add('is-menu-open');
  };

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });

  globalNavigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', event => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    const clickedOutsideMenu = !menuButton.contains(event.target)
      && !globalNavigation.contains(event.target);

    if (isOpen && clickedOutsideMenu) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;

    closeMenu();
    menuButton.focus();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });
}

/**
 * FAQアコーディオン
 */
function setupFaqAccordion() {
  document.querySelectorAll('.faq-item button').forEach(button => {
    const answerId = button.getAttribute('aria-controls');
    const answer = answerId ? document.getElementById(answerId) : null;
    const item = button.closest('.faq-item');

    if (!answer || !item) return;

    const syncFaqState = isOpen => {
      item.classList.toggle('is-open', isOpen);
      button.setAttribute('aria-expanded', String(isOpen));
      answer.hidden = !isOpen;
    };

    syncFaqState(button.getAttribute('aria-expanded') === 'true');
    button.addEventListener('click', () => {
      syncFaqState(button.getAttribute('aria-expanded') !== 'true');
    });
  });
}

/**
 * お問い合わせフォーム
 */
function setupContactForm() {
  const contactForm = document.querySelector('.contact-form');

  if (!contactForm) return;

  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    const status = contactForm.querySelector('[data-form-status]');

    if (status) {
      status.dataset.state = 'unavailable';
      status.textContent = '現在、お問い合わせフォームは準備中です。送信は行われていません。';
    }

    // TODO: 正式な送信先が確定したら、送信中・成功・失敗の状態更新と二重送信防止を実装する。
  });
}

/**
 * ページ共通の表示モーション
 */
function setupRevealAnimations() {
  const revealElements = [...document.querySelectorAll('[data-reveal]')];

  if (!revealElements.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.documentElement.classList.add('motion-ready');

  const showElement = element => {
    element.classList.add('is-visible');
  };

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealElements.forEach(showElement);
    return;
  }

  const priorityElements = revealElements.filter(element =>
    element.hasAttribute('data-reveal-priority')
  );
  const scrollElements = revealElements.filter(element =>
    !element.hasAttribute('data-reveal-priority')
  );

  requestAnimationFrame(() => {
    priorityElements.forEach(showElement);
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      showElement(entry.target);
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.12
  });

  scrollElements.forEach(element => observer.observe(element));
}

setupStickyHeader();
setupMobileMenu();
setupFaqAccordion();
setupContactForm();
setupRevealAnimations();
