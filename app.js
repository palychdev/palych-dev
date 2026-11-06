(() => {
  'use strict';
  document.documentElement.classList.add('js');
  document.querySelector('#reload-site')?.addEventListener('click', () => location.reload());
  const projects = {
    orbit: {
      title: 'Orbit', type: 'Приложение для Windows · C# / WPF',
      summary: 'Приложения под рукой. Радиальное меню для запуска и переключения между окнами.',
      paragraphs: ['Orbit живёт в трее и вызывается горячей клавишей. Нужное приложение можно открыть из радиального меню, а если оно уже запущено — переключиться на его окно.', 'В настройках — список приложений, их порядок и сочетание клавиш. Это самостоятельный проект для Windows, исходный код открыт.'],
      links: [{label: 'Код на GitHub', url: 'https://github.com/palychdev/Orbit'}]
    },
    archon: {
      title: 'Archon', type: 'Утилита · Python / ClamAV / YARA',
      summary: 'Сканер файлов и вложенных архивов на базе ClamAV с дополнительными YARA-правилами.',
      paragraphs: ['Archon проверяет файлы и вложенные архивы, находит подозрительные сигнатуры и формирует текстовые и JSON-отчёты. ClamAV отвечает за сканирование содержимого архивов; YARA и эвристика энтропии дополняют проверку файлов.', 'У проекта есть командная строка, пошаговое меню и графическое окно. Исходный код, настройка и описание работы — в репозитории.'],
      links: [{label: 'Код на GitHub', url: 'https://github.com/palychdev/archon'}]
    },
    liber: {
      title: 'liber.net', type: 'Браузер · Chromium',
      summary: 'Браузер на базе Chromium со встроенным обходом блокировок YouTube и Discord.',
      paragraphs: ['liber.net — мой эксперимент с собственным браузером. В основе — Chromium, а встроенный обход DPI-блокировок предназначен для доступа к YouTube и Discord. Обычная работа с вебом и доступ к этим сервисам — в одном приложении.', 'Исходный код и описание сборки открыты на GitHub. Можно заглянуть внутрь, разобраться, как устроен проект, и собрать браузер самостоятельно.'],
      links: [{label: 'Код на GitHub', url: 'https://github.com/palychdev/liber.net'}]
    }
  };
  const dialog = document.querySelector('#project-dialog');
  if (typeof dialog.showModal === 'function') document.documentElement.classList.add('dialogs-ready');
  const cards = [...document.querySelectorAll('.project')];
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  let opener = null;

  function applyFilter(filter, announce = false) {
    const selected = ['all', 'tool', 'browser'].includes(filter) ? filter : 'all';
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === selected)));
    let shown = 0;
    cards.forEach(card => {
      const visible = selected === 'all' || card.dataset.category === selected;
      card.hidden = !visible;
      if (visible) shown++;
    });
    if (announce) document.querySelector('#filter-status').textContent = `Показано проектов: ${shown}`;
  }
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    applyFilter(filter, true);
    const url = new URL(location.href);
    if (filter === 'all') url.searchParams.delete('type'); else url.searchParams.set('type', filter);
    history.pushState(null, '', url);
  }));
  applyFilter(new URL(location.href).searchParams.get('type'));
  addEventListener('popstate', () => applyFilter(new URL(location.href).searchParams.get('type'), true));

  function openProject(id, trigger) {
    const project = projects[id];
    if (!project || typeof dialog.showModal !== 'function') return false;
    opener = trigger;
    document.querySelector('#dialog-type').textContent = project.type;
    document.querySelector('#dialog-title').textContent = project.title;
    document.querySelector('#dialog-summary').textContent = project.summary;
    const media = document.querySelector('#dialog-media');
    media.replaceChildren();
    media.className = 'dialog-media';
    const poster = document.querySelector(`[data-project="${id}"] .project-poster`);
    if (poster) media.append(poster.cloneNode(true));
    const body = document.querySelector('#dialog-body');
    body.replaceChildren(...project.paragraphs.map(text => {
      const p = document.createElement('p'); p.textContent = text; return p;
    }));
    const links = document.querySelector('#dialog-links');
    links.replaceChildren(...project.links.map((item, index) => {
      const link = document.createElement('a');
      link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = item.label;
      if (index) link.className = 'secondary';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('arrow'); svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', '#arrow-ne'); svg.append(use); link.append(svg);
      return link;
    }));
    dialog.showModal();
    document.body.classList.add('dialog-open');
    document.dispatchEvent(new Event('portfolio:dialog-open'));
    dialog.scrollTop = 0;
    document.querySelector('.dialog-close').focus({preventScroll:true});
    return true;
  }
  document.querySelectorAll('[data-project]').forEach(trigger => trigger.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    if (openProject(trigger.dataset.project, trigger)) event.preventDefault();
  }));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('dialog-open');
    document.dispatchEvent(new Event('portfolio:dialog-close'));
    if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus({preventScroll:true});
  });

  const copyButton = document.querySelector('#copy-email');
  const copyStatus = document.querySelector('#copy-status');
  copyButton.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('palychbn@gmail.com');
      copyStatus.textContent = 'Почта скопирована.';
    } catch {
      copyStatus.textContent = 'Можно скопировать адрес: palychbn@gmail.com';
    }
  });
})();
