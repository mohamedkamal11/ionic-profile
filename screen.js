// Interactive edition (mode=screen): fits each A4 page to the screen, animates it in as it arrives,
// and adds a top bar (sections menu, page count, language), keyboard keys and an image viewer.
(() => {
  document.documentElement.classList.add('js');
  const pages = [...document.querySelectorAll('.page')], B = document.body, rtl = document.dir === 'rtl';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const L = (ar, en) => (rtl ? ar : en);
  const num = (s) => +String(s).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '');

  // fit one A4 page (210×297 mm) inside the window
  const MM = 96 / 25.4;
  const fit = () => {
    const W = document.documentElement.clientWidth, pad = W < 700 ? 12 : 120;
    const s = Math.min((W - pad) / (210 * MM), (innerHeight - 80) / (297 * MM));
    document.documentElement.style.setProperty('--s', s.toFixed(4));
  };
  fit(); addEventListener('resize', fit);

  // mark what rises in on each page (outermost match only, so nested blocks do not move twice)
  const SEL = '.k,h1,h2,h3,.lead,p,li,article,figure,tr,.facts>div,.dv>*,.qr,.pc>*,.dg>*,.org>*,img:not(.bg)';
  pages.forEach((pg) => {
    let i = 0;
    pg.querySelectorAll(SEL).forEach((el) => {
      if (el.closest('.pf,.lg,.logo') || el.parentElement.closest('.anim')) return;
      el.classList.add('anim'); el.style.setProperty('--i', Math.min(i++, 16));
    });
  });

  // line icons draw themselves (each shape measured as length 1)
  document.querySelectorAll('svg.ic').forEach((sv) => sv.querySelectorAll('path,circle,rect,line,polyline').forEach((p) => p.setAttribute('pathLength', '1')));

  // numbers in the facts block count up when their page arrives
  const countUp = (pg) => pg.querySelectorAll('.facts b').forEach((b) => {
    const t = b.textContent.trim(); if (!/^\d+$/.test(t) || reduce) return;
    const end = +t, from = end > 1000 ? end - 30 : 0, t0 = performance.now();
    const step = (now) => { const k = Math.min(1, (now - t0) / 1400); b.textContent = Math.round(from + (end - from) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  // sections = cover, contents, then every section divider
  const secs = [{ n: '', t: L('الغلاف', 'Cover'), i: 0 }];
  const toc = pages.findIndex((p) => p.classList.contains('toc'));
  if (toc > -1) secs.push({ n: '', t: L('المحتوى', 'Contents'), i: toc });
  pages.forEach((p, i) => { if (p.classList.contains('divider')) secs.push({ n: p.querySelector('.num')?.textContent || '', t: p.querySelector('h2')?.textContent || '', i }); });
  // the 12-page profile has no section dividers: list each page by its heading instead
  if (secs.length < 3) pages.forEach((p, i) => { const h = p.querySelector('h2'); if (i && h) secs.push({ n: (p.querySelector('.k')?.textContent.match(/\d+/) || [''])[0], t: h.textContent.trim(), i }); });
  const secOf = (i) => secs.filter((s) => s.i <= i).pop();

  // top bar, progress line, sections menu, image viewer
  const other = B.dataset.other;
  B.insertAdjacentHTML('afterbegin', `
  <header class="sb"><button class="mb" aria-expanded="false" aria-controls="menu" aria-label="${L('الأقسام', 'Sections')}">☰ <span>${L('الأقسام', 'Sections')}</span></button>
   <span class="lg">${document.querySelector('.cover .logo')?.innerHTML || ''}</span><span class="ttl"></span>
   <button class="pv" aria-label="${L('الصفحة السابقة', 'Previous page')}">${rtl ? '→' : '←'}</button><span class="ct" dir="ltr" aria-live="polite"></span>
   <button class="nx" aria-label="${L('الصفحة التالية', 'Next page')}">${rtl ? '←' : '→'}</button>${other ? `<a href="${other}" lang="${rtl ? 'en' : 'ar'}">${B.dataset.otherLabel}</a>` : ''}</header>
  <div class="pr"><i></i></div>
  <nav class="menu" id="menu" aria-label="${L('الأقسام', 'Sections')}">${secs.map((s, k) => `<a href="#p${s.i + 1}" data-k="${k}"><b>${s.n}</b>${s.t}</a>`).join('')}</nav>
  <div class="lb" role="dialog" aria-modal="true" aria-label="${L('عرض الصورة', 'Image viewer')}"><img alt=""><button class="x" aria-label="${L('إغلاق', 'Close')}">×</button>
   <button class="pv" aria-label="${L('السابقة', 'Previous')}">${rtl ? '›' : '‹'}</button><button class="nx" aria-label="${L('التالية', 'Next')}">${rtl ? '‹' : '›'}</button><span class="n"></span></div>`);
  pages.forEach((p, i) => { p.id = 'p' + (i + 1); });
  const $ = (s) => document.querySelector(s);
  const ct = $('.sb .ct'), ttl = $('.sb .ttl'), bar = $('.pr i'), menu = $('.menu'), mb = $('.mb');

  let cur = 0;
  const go = (i) => { i = Math.max(0, Math.min(pages.length - 1, i)); pages[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: innerWidth < 700 ? 'start' : 'center' }); };
  const show = (i) => {
    pages.forEach((p, k) => p.classList.toggle('away', k !== i));
    cur = i; ct.textContent = `${i + 1} / ${pages.length}`; bar.style.width = `${((i + 1) / pages.length) * 100}%`;
    const s = secOf(i); ttl.textContent = s ? `${s.n ? s.n + ' · ' : ''}${s.t}` : '';
    menu.querySelectorAll('a').forEach((a) => a.classList.toggle('on', secs[a.dataset.k] === s));
    history.replaceState(null, '', '#p' + (i + 1));
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting || e.target.classList.contains('in')) return;
    e.target.classList.add('in'); countUp(e.target);
  }), { threshold: 0.12 });
  // the current page is the one crossing the middle of the screen (works for phone pages taller than the screen)
  const mid = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(pages.indexOf(e.target)); }), { rootMargin: '-50% 0px -50% 0px' });
  // opening: the logo rises like a column with the slogan, then the pages start (tap to skip)
  const startPages = () => pages.forEach((p) => { io.observe(p); mid.observe(p); });
  // the opening is in the page itself (build.mjs) so it also plays where scripts cannot run
  const intro = document.querySelector('.intro');
  if (reduce || num(location.hash) > 1 || !intro) { intro?.remove(); startPages(); }
  else {
    let done = false;
    const end = () => { if (done) return; done = true; intro.classList.add('done'); startPages(); setTimeout(() => intro.remove(), 1200); };
    intro.onclick = end; setTimeout(end, 2900);
  }

  const toggleMenu = (open = !menu.classList.contains('open')) => { menu.classList.toggle('open', open); mb.setAttribute('aria-expanded', open); };
  mb.onclick = () => toggleMenu();
  menu.onclick = (e) => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); toggleMenu(false); go(secs[a.dataset.k].i); };
  $('.sb .pv').onclick = () => go(cur - 1); $('.sb .nx').onclick = () => go(cur + 1);
  // contents page: each line jumps to its page
  document.querySelectorAll('.tocl li').forEach((li) => { const n = num(li.querySelector('.p')?.textContent); if (n) li.onclick = () => go(n - 1); });

  // image viewer: every photo on a page opens large; arrows move between the photos of that page
  const lb = $('.lb'), lbi = lb.querySelector('img'), lbn = lb.querySelector('.n');
  // the offline file shows repeated images through CSS `content` (see offline.mjs): read the real one from there
  const realSrc = (im) => getComputedStyle(im).content.match(/^url\("?(.+?)"?\)$/)?.[1] || im.src;
  let set = [], at = 0;
  const view = (k) => { at = (k + set.length) % set.length; lbi.src = realSrc(set[at]); lbn.textContent = set.length > 1 ? `${at + 1} / ${set.length}` : ''; lbi.style.animation = 'none'; void lbi.offsetWidth; lbi.style.animation = ''; };
  const close = () => lb.classList.remove('open');
  document.addEventListener('click', (e) => {
    const im = e.target.closest('.page img:not(.bg)'); if (!im) return;
    set = [...im.closest('.page').querySelectorAll('img:not(.bg)')]; view(set.indexOf(im)); lb.classList.add('open'); lb.querySelector('.x').focus();
  });
  lb.onclick = (e) => { if (e.target === lb) close(); };
  lb.querySelector('.x').onclick = close;
  lb.querySelector('.pv').onclick = () => view(at - 1); lb.querySelector('.nx').onclick = () => view(at + 1);

  addEventListener('keydown', (e) => {
    const k = e.key, open = lb.classList.contains('open');
    if (k === 'Escape') { close(); toggleMenu(false); return; }
    const back = k === (rtl ? 'ArrowRight' : 'ArrowLeft'), fwd = k === (rtl ? 'ArrowLeft' : 'ArrowRight');
    if (open) { if (back) view(at - 1); if (fwd) view(at + 1); return; }
    if (['ArrowDown', 'PageDown', ' '].includes(k) || fwd) { e.preventDefault(); go(cur + 1); }
    else if (['ArrowUp', 'PageUp'].includes(k) || back) { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); } else if (k === 'End') { e.preventDefault(); go(pages.length - 1); }
  });

  // open at the page in the link (#p12), otherwise at the cover
  const start = num(location.hash) - 1;
  if (start > 0) setTimeout(() => pages[start].scrollIntoView({ block: innerWidth < 700 ? 'start' : 'center' }), 50);
})();
