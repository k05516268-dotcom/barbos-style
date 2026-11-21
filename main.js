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

/* ---------- Онлайн-запись: календарь -> мастер и время -> контакты ---------- */
(function bookingModule() {
  const modal = document.getElementById('booking');
  if (!modal) return;

  // Три мастера салона. Замените имена и описания на реальные.
  const MASTERS = [
    { id: 'anna', name: 'Анна', nameGen: 'Анны', role: 'топ-грумер, любые породы' },
    { id: 'maria', name: 'Мария', nameGen: 'Марии', role: 'грумер-стилист, модельные стрижки' },
    { id: 'igor', name: 'Игорь', nameGen: 'Игоря', role: 'грумер, крупные и сложные породы' }
  ];

  // Дневной график мастера: 4 приёма по 2 часа, обед 14:00 - 15:00.
  // Салон открыт 10:00 - 20:00, последний приём заканчивается в 19:00,
  // остаётся час на уборку и ожидание хозяев.
  const SLOTS = ['10:00', '12:00', '15:00', '17:00'];

  // График смен: каждый день работают двое из трёх мастеров, пары чередуются по кругу.
  // День 1 - Анна и Мария, день 2 - Мария и Игорь, день 3 - Анна и Игорь, дальше снова по кругу.
  const SHIFT_PAIRS = [
    ['anna', 'maria'],
    ['maria', 'igor'],
    ['anna', 'igor']
  ];

  function workingMasters(date) {
    const dayNum = Math.floor(date.getTime() / 86400000);
    return SHIFT_PAIRS[((dayNum % 3) + 3) % 3];
  }

  const state = {
    step: 1,
    date: null,      // объект Date выбранного дня
    master: null,    // id мастера
    slot: null,      // строка вида '12:00'
    month: null,     // первый день отображаемого месяца
    done: false
  };

  const stepsEls = modal.querySelectorAll('.booking__step');
  const dots = modal.querySelectorAll('#bookingProgress li');
  const calTitle = document.getElementById('calTitle');
  const calGrid = document.getElementById('calGrid');
  const prevBtn = modal.querySelector('[data-cal-prev]');
  const nextBtn = modal.querySelector('[data-cal-next]');
  const scheduleWrap = document.getElementById('scheduleWrap');
  const slotsDate = document.getElementById('slotsDate');
  const shiftInfo = document.getElementById('shiftInfo');
  const form = document.getElementById('bookingForm');
  const errorEl = document.getElementById('bookingError');

  let lastFocused = null;

  const today = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const sameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const dateKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const fmtDate = (d) =>
    new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(d);

  const monthTitle = (d) =>
    new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(d);

  /* Демо-занятость: стабильный псевдослучайный "график" мастера.
     В реальном сайте здесь будет запрос к базе записей салона. */
  function isBusy(d, masterId, slot) {
    const s = dateKey(d) + masterId + slot;
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return h % 10 < 3;
  }

  /* --- Шаги --- */
  function showStep(n) {
    state.step = n;
    stepsEls.forEach((el) => {
      el.hidden = Number(el.dataset.step) !== n;
    });
    dots.forEach((dot) => {
      const k = Number(dot.dataset.dot);
      dot.classList.toggle('is-active', n < 4 ? k === n : k === 3);
      dot.classList.toggle('is-done', n === 4 || k < n);
    });
    updateNextButtons();
    modal.querySelector('.booking__panel').scrollTop = 0;
  }

  function updateNextButtons() {
    const step1Next = stepsEls[0].querySelector('[data-next]');
    const step2Next = stepsEls[1].querySelector('[data-next]');
    step1Next.disabled = !state.date;
    step2Next.disabled = !(state.master && state.slot);
  }

  /* --- Календарь --- */
  function renderCalendar() {
    const month = state.month;
    calTitle.textContent = monthTitle(month);
    calGrid.innerHTML = '';

    // неделя начинается с понедельника
    const lead = (month.getDay() + 6) % 7;
    for (let i = 0; i < lead; i++) {
      const blank = document.createElement('span');
      blank.className = 'booking__day booking__day--empty';
      blank.setAttribute('aria-hidden', 'true');
      calGrid.appendChild(blank);
    }

    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(month.getFullYear(), month.getMonth(), day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'booking__day';
      btn.textContent = day;
      if (sameDay(d, today())) btn.classList.add('booking__day--today');
      if (d < today()) btn.disabled = true;
      if (sameDay(d, state.date)) btn.classList.add('booking__day--selected');
      btn.addEventListener('click', () => {
        state.date = d;
        state.slot = null; // время нужно выбрать заново для новой даты
        // если выбранный мастер в этот день не в смене - выбор мастера сбрасываем
        if (state.master && !workingMasters(d).includes(state.master)) state.master = null;
        renderCalendar();
        renderShiftInfo();
        updateNextButtons();
      });
      calGrid.appendChild(btn);
    }

    // навигация: от текущего месяца до шести месяцев вперёд
    const base = new Date(today().getFullYear(), today().getMonth(), 1);
    const limit = new Date(base.getFullYear(), base.getMonth() + 6, 1);
    prevBtn.disabled = state.month <= base;
    nextBtn.disabled = state.month >= limit;
  }

  // листание календаря по месяцам
  prevBtn.addEventListener('click', () => {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
    renderCalendar();
  });

  nextBtn.addEventListener('click', () => {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    renderCalendar();
  });

  /* --- Подсказка под календарём: кто в смене в выбранный день --- */
  function renderShiftInfo() {
    if (!state.date) {
      shiftInfo.hidden = true;
      return;
    }
    const names = workingMasters(state.date).map((id) => MASTERS.find((m) => m.id === id).name);
    const off = MASTERS.find((m) => !workingMasters(state.date).includes(m.id));
    shiftInfo.innerHTML = `В этот день в смене: <strong>${names.join(' и ')}</strong>, у ${off.nameGen} выходной`;
    shiftInfo.hidden = false;
  }

  /* --- Временное окно: конец приёма через 2 часа --- */
  function slotEnd(slot) {
    const h = parseInt(slot, 10) + 2;
    return `${String(h).padStart(2, '0')}:00`;
  }

  /* --- График дня: отдельный блок для каждого мастера.
     У мастеров смены свои окна, они работают параллельно,
     поэтому одно и то же время может быть занято у одного и свободно у второго.
     Третий мастер показан серым с подписью «выходной». --- */
  function renderSchedule() {
    slotsDate.textContent = fmtDate(state.date);
    scheduleWrap.innerHTML = '';
    const onShift = workingMasters(state.date);
    const now = new Date();

    MASTERS.forEach((m) => {
      const off = !onShift.includes(m.id);
      const block = document.createElement('div');
      block.className = 'booking__shift-block' + (off ? ' is-off' : '');

      const head = document.createElement('div');
      head.className = 'booking__shift-head';
      head.innerHTML = off
        ? `<strong>${m.name}</strong><span>выходной</span>`
        : `<strong>${m.name}</strong><span>${m.role}</span>`;
      block.appendChild(head);

      if (off) {
        scheduleWrap.appendChild(block);
        return;
      }

      const slots = document.createElement('div');
      slots.className = 'booking__slots';
      SLOTS.forEach((slot) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const selected = state.master === m.id && state.slot === slot;
        btn.className = 'booking__slot' + (selected ? ' is-selected' : '');
        btn.innerHTML = `${slot}<small>до ${slotEnd(slot)}</small>`;

        let reason = '';
        if (isBusy(state.date, m.id, slot)) {
          reason = 'Занято';
        } else if (sameDay(state.date, now)) {
          // на сегодня - только окна, до начала которых больше часа
          const start = new Date(state.date);
          start.setHours(parseInt(slot, 10), 0, 0, 0);
          if (start.getTime() - now.getTime() < 60 * 60 * 1000) reason = 'Уже поздно';
        }

        if (reason) {
          btn.disabled = true;
          btn.innerHTML = `${slot}<small>${reason}</small>`;
        } else {
          btn.addEventListener('click', () => {
            // одно нажатие выбирает и мастера, и время
            state.master = m.id;
            state.slot = slot;
            renderSchedule();
            updateNextButtons();
          });
        }
        slots.appendChild(btn);
      });
      block.appendChild(slots);
      scheduleWrap.appendChild(block);
    });
  }

  /* --- Открытие и закрытие --- */
  function openModal() {
    if (!state.month) {
      state.month = new Date(today().getFullYear(), today().getMonth(), 1);
    }
    renderCalendar();
    renderShiftInfo();
    if (state.date) renderSchedule();
    showStep(state.done ? 1 : state.step);
    if (state.done) resetAll();
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.booking__close').focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (state.done) resetAll();
    if (lastFocused) lastFocused.focus();
  }

  function resetAll() {
    state.date = null;
    state.master = null;
    state.slot = null;
    state.done = false;
    state.month = new Date(today().getFullYear(), today().getMonth(), 1);
    form.reset();
    errorEl.hidden = true;
    renderCalendar();
    renderShiftInfo();
    showStep(1);
  }

  document.querySelectorAll('[data-booking-open]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  modal.querySelectorAll('[data-booking-close]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* --- Навигация по шагам --- */
  stepsEls.forEach((stepEl) => {
    const next = stepEl.querySelector('[data-next]');
    const back = stepEl.querySelector('[data-back]');
    if (next) {
      next.addEventListener('click', () => {
        if (state.step === 1) {
          renderSchedule();
          showStep(2);
        } else if (state.step === 2) {
          showStep(3);
        }
      });
    }
    if (back) back.addEventListener('click', () => showStep(state.step - 1));
  });

  /* --- Отправка формы --- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('bfName').value.trim();
    const phone = document.getElementById('bfPhone').value.trim();
    const dog = document.getElementById('bfDog').value.trim();
    const consent = document.getElementById('bfConsent').checked;
    const digits = phone.replace(/\D/g, '');

    // согласие по ФЗ-152 обязательно, телефон - минимум 10 цифр
    if (!name || digits.length < 10 || !consent) {
      errorEl.hidden = false;
      return;
    }
    errorEl.hidden = true;

    const channel = form.querySelector('input[name="channel"]:checked').value;
    const master = MASTERS.find((m) => m.id === state.master);

    // номер записи: БС-дата-случайные три цифры
    const num = 'БС-' + dateKey(state.date).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900);
    document.getElementById('bookingNum').textContent = num;

    const summary = document.getElementById('bookingSummary');
    summary.innerHTML = `
      <dt>Дата</dt><dd>${fmtDate(state.date)}</dd>
      <dt>Время</dt><dd>${state.slot} - ${slotEnd(state.slot)}</dd>
      <dt>Мастер</dt><dd>${master.name}</dd>
      <dt>Гость</dt><dd>${name}${dog ? ' и ' + dog : ''}</dd>
      <dt>Связь</dt><dd>${channel}, ${phone}</dd>`;

    state.done = true;
    showStep(4);
  });
})();
