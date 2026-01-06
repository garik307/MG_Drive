document.addEventListener('DOMContentLoaded', () => {
  const openers = document.querySelectorAll('.open_menu');
  const closers = document.querySelectorAll('.close_menu');
  const overlay = document.querySelector('.mobile-overlay');

  const open = () => { document.body.classList.add('nav-open'); };
  const close = () => { document.body.classList.remove('nav-open'); };

  openers.forEach(btn => btn.addEventListener('click', open));
  closers.forEach(btn => btn.addEventListener('click', close));
  if (overlay) overlay.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
});
