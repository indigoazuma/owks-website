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
  const contactForm = document.querySelector('[data-contact-form]');

  if (!contactForm) return;

  const submitButton = contactForm.querySelector('[data-contact-submit]');
  const tokenInput = contactForm.querySelector('[data-contact-token]');
  const status = contactForm.querySelector('[data-form-status]');
  const endpoint = contactForm.getAttribute('action');
  let isSubmitting = false;

  const setStatus = (state, message) => {
    if (!status) return;

    status.dataset.state = state;
    status.textContent = message;
  };

  const setSubmitEnabled = enabled => {
    if (!submitButton) return;

    submitButton.disabled = !enabled;
    submitButton.setAttribute('aria-disabled', String(!enabled));
  };

  const loadToken = async (announceStatus = true) => {
    if (!endpoint || !tokenInput) return false;

    try {
      const response = await fetch(`${endpoint}?action=token`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();

      if (!response.ok || !result.ready || !result.token) {
        throw new Error('Contact form is not configured.');
      }

      tokenInput.value = result.token;
      setSubmitEnabled(true);
      if (announceStatus) {
        setStatus('ready', '必要事項をご入力のうえ、送信してください。');
      }
      return true;
    } catch {
      tokenInput.value = '';
      setSubmitEnabled(false);
      setStatus('unavailable', '現在、お問い合わせフォームは準備中です。お急ぎの場合はメールまたはお電話でお問い合わせください。');
      return false;
    }
  };

  contactForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (isSubmitting || !endpoint || !tokenInput?.value) return;

    isSubmitting = true;
    setSubmitEnabled(false);
    contactForm.setAttribute('aria-busy', 'true');
    setStatus('sending', '送信しています。しばらくお待ちください。');
    let failureMessage = '送信できませんでした。時間をおいて再度お試しください。';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new FormData(contactForm),
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        failureMessage = result.message || failureMessage;
        throw new Error('Contact submission failed.');
      }

      contactForm.reset();
      tokenInput.value = result.token || '';
      setStatus('success', result.message || 'お問い合わせを受け付けました。');
      setSubmitEnabled(Boolean(result.token));
    } catch {
      await loadToken(false);
      setStatus('error', failureMessage);
    } finally {
      isSubmitting = false;
      contactForm.removeAttribute('aria-busy');
    }
  });

  loadToken();
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
