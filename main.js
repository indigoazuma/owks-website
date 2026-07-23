const hasPageSpecificCta = document.querySelector('.home-cta, [data-page-pre-footer]') !== null;
const hidesCommonPreFooter = document.body.classList.contains('page-contact');
const preFooter = hasPageSpecificCta || hidesCommonPreFooter ? '' : `
<section class="pre-footer">
  <div>製品についてのご相談・ご質問は、お気軽にお問い合わせください。</div>
  <div><a class="button button--light pre-footer__secondary" href="company.html">会社概要はこちら →</a><a class="button" href="contact.html">お問い合わせ</a></div>
</section>`;
const footer = `
${preFooter}
<footer class="site-footer">
  <div><strong>株式会社OWKS</strong><p>防災シェルターの企画・開発・製作<br>宮崎本社 / 東京支社<br>TEL: 0985-44-2110<br>MAIL: contact@owks.jp</p></div>
  <div><span>PAGES</span><a href="product.html">製品詳細</a><a href="simulation.html">シミュレーション</a><a href="faq.html">FAQ</a><a href="company.html">会社概要</a><a href="contact.html">お問い合わせ</a></div>
  <div><span>LEGAL</span></div>
</footer>`;
document.querySelectorAll('[data-footer]').forEach(el => el.innerHTML = footer);
const menu = document.querySelector('.menu-button');
const nav = document.querySelector('.global-nav');
menu?.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open');
});
document.querySelectorAll('.faq-item button').forEach(button => button.addEventListener('click', () => {
  const item = button.closest('.faq-item');
  const open = item.classList.toggle('open');
  button.setAttribute('aria-expanded', String(open));
}));
document.querySelector('.contact-form')?.addEventListener('submit', event => {
  event.preventDefault();
  const message = document.querySelector('.form-message');
  message.textContent = 'お問い合わせありがとうございます。送信内容を受け付けました。';
});
