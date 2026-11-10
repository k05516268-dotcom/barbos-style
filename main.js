// Проявление секций при скролле
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal_visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// Мобильное меню
const burger = document.getElementById('burger');
const nav = document.querySelector('.nav');

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('nav_open');
  burger.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav__links a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav_open');
    burger.setAttribute('aria-expanded', 'false');
  });
});
