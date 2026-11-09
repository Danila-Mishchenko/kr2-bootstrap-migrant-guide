'use strict';
const guide = window.Guide;
const panel = document.getElementById('questionnaire');
const form = document.getElementById('guide-form');
const questionsBox = document.getElementById('questions');
const documentsBox = document.getElementById('document-choices');
const result = document.getElementById('result');
const answerButton = document.getElementById('answer-button');
let currentCard;
let draftKey;
let savedDraft;
let missingDocuments = [];
let answers = {};
let owned = {};
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
if (panel) {
  const cardId = new URLSearchParams(window.location.search).get('card');
  let currentGroup;
  for (const group of guide.groups) {
    const card = group.cards.find(function (item) {
      return item.id === cardId;
    });
    if (card) {
      currentCard = card;
      currentGroup = group;
      break;
    }
  }
  if (currentCard) {
    document.getElementById('questionnaire-title').textContent = currentCard.title;
    document.title = currentCard.title + ' — Справка для иностранцев';
    draftKey = 'migrant-guide:draft:' + currentCard.id;
    setupDraft();
    document.getElementById('back-to-section').href = currentGroup.id + '.html';
    panel.hidden = false;
    renderQuestions();
  } else {
    document.getElementById('not-found').hidden = false;
  }
}

// Анкета
function renderQuestions() {
  let html = '';
  let complete = true;
  for (const question of currentCard.questions) {
    if (!question.when(answers)) {
      delete answers[question.id];
      continue;
    }
    if (!answers[question.id]) complete = false;
    html += `<div class="col-md-6">
      <label class="form-label" for="q-${question.id}">${escapeHtml(question.label)}</label>
      <select class="form-select" id="q-${question.id}" name="${question.id}" required>
        <option value="">Выберите вариант</option>`;
    for (const [value, label] of question.options) {
      const selected = answers[question.id] === value ? 'selected' : '';
      html += `<option value="${value}" ${selected}>${escapeHtml(label)}</option>`;
    }
    html += '</select></div>';
  }
  questionsBox.innerHTML = html;
  answerButton.disabled = !complete;
  renderDocuments(complete);
}

// Наличие документов
function renderDocuments(complete) {
  result.hidden = true;
  documentsBox.innerHTML = '';
  document.getElementById('documents-hint').textContent = complete
    ? 'Выберите наличие документов. Список предварительный, условия указаны в ответе.'
    : 'Сначала ответьте на все вопросы.';
  if (!complete) return;
  const required = guide.plan(currentCard.id, answers).ids;
  for (const id in owned) {
    if (!required.includes(id)) delete owned[id];
  }
  let html = '';
  for (const id of required) {
    html += `<div class="document-list__item">
      <label for="doc-${id}">${escapeHtml(guide.documents[id][0])}</label>
      <select class="form-select" id="doc-${id}" data-document="${id}">
        <option value="no">Нет</option>
        <option value="yes" ${owned[id] ? 'selected' : ''}>Есть</option>
      </select></div>`;
  }
  documentsBox.innerHTML = html;
}

// Черновик анкеты
function setupDraft() {
  const actions = document.getElementById('draft-actions');
  const resume = document.getElementById('resume-draft');
  try {
    savedDraft = JSON.parse(localStorage.getItem(draftKey));
  } catch {
    savedDraft = null;
  }
  actions.hidden = !savedDraft;

  resume.addEventListener('click', function () {
    for (const question of currentCard.questions) {
      const value = savedDraft?.answers?.[question.id];
      if (question.options.some(([option]) => option === value)) answers[question.id] = value;
    }
    for (const id of Object.keys(guide.documents)) {
      if (savedDraft?.owned?.[id] === true) owned[id] = true;
    }
    renderQuestions();
    saveDraft();
    questionsBox.querySelector('select')?.focus();
  });

  document.getElementById('reset-draft').addEventListener('click', function () {
    answers = {};
    owned = {};
    savedDraft = null;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Хранилище может быть отключено.
    }
    actions.hidden = true;
    renderQuestions();
    questionsBox.querySelector('select')?.focus();
  });
}

function saveDraft() {
  try {
    localStorage.setItem(draftKey, JSON.stringify({ answers, owned }));
    document.getElementById('resume-draft').hidden = true;
    document.getElementById('draft-actions').hidden = false;
  } catch {
    // Анкета работает и без сохранения.
  }
}

if (form)
  form.addEventListener('change', function (event) {
    const field = event.target;
    if (field.dataset.document) {
      owned[field.dataset.document] = field.value === 'yes';
      if (!result.hidden) renderResult();
    } else if (field.name) {
      answers[field.name] = field.value;
      renderQuestions();
      document.getElementById(field.id)?.focus({ preventScroll: true });
    }
    saveDraft();
  });

// Ответ
function renderResult() {
  const selected = guide.plan(currentCard.id, answers);
  const missingIds = selected.ids.filter((id) => !owned[id]);
  missingDocuments = missingIds.map((id) => guide.documents[id][0]);
  const ready = selected.ids.length - missingIds.length;

  document.getElementById('result-count').textContent =
    `Готово: ${ready} из ${selected.ids.length}. Осталось подготовить или уточнить: ${missingIds.length}.`;
  const progress = document.getElementById('result-progress');
  progress.max = selected.ids.length || 1;
  progress.value = ready;
  document.getElementById('missing-documents').innerHTML = missingDocuments
    .map((name) => '<li>' + escapeHtml(name) + '</li>')
    .join('');
  document.getElementById('missing-empty').hidden = missingIds.length > 0;
  document.getElementById('copy-missing').disabled = missingIds.length === 0;
  document.getElementById('copy-status').textContent = '';

  document.getElementById('result-documents').innerHTML = selected.ids
    .map(function (id) {
      const [name, description] = guide.documents[id];
      return `<div class="result__item${owned[id] ? ' result__item--ready' : ''}">
        <h3 class="h5">${escapeHtml(name)}</h3>
        <p class="result__state">${owned[id] ? 'Уже есть' : 'Подготовить / уточнить применимость'}</p>
        <p>${escapeHtml(description)}</p>
        <label class="form-check-label">
          <input class="form-check-input" type="checkbox" data-result-document="${id}" ${owned[id] ? 'checked' : ''} />
          Документ уже есть
        </label>
      </div>`;
    })
    .join('');
  document.getElementById('result-notes').innerHTML = selected.notes
    .map((note) => '<p>' + escapeHtml(note) + '</p>')
    .join('');
}

if (form) {
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (answerButton.disabled || !form.reportValidity()) return;
    renderResult();
    result.hidden = false;
    document.getElementById('result-title').focus({ preventScroll: true });
    result.scrollIntoView();
  });

  result.addEventListener('change', function (event) {
    const id = event.target.dataset.resultDocument;
    if (!id) return;
    owned[id] = event.target.checked;
    documentsBox.querySelector(`[data-document="${id}"]`).value = owned[id] ? 'yes' : 'no';
    saveDraft();
    renderResult();
    result.querySelector(`[data-result-document="${id}"]`).focus({ preventScroll: true });
  });

  document.getElementById('copy-missing').addEventListener('click', async function () {
    const status = document.getElementById('copy-status');
    const text = [currentCard.title, ...missingDocuments].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Список скопирован.';
    } catch {
      status.textContent =
        'Копирование недоступно. Выделите краткий список и скопируйте его вручную.';
    }
  });
}

// Поиск
const search = document.getElementById('guide-search');
if (search) {
  const keywords = { vnzh: 'внж получение внж', rvpo: 'рвпо разрешение', arrival: 'регистрация' };
  const entries = guide.groups.flatMap((group) => [
    { title: group.title, href: group.id + '.html', terms: group.title + ' ' + group.text },
    ...group.cards.map((card) => ({
      title: card.title,
      href: 'questionnaire.html?card=' + card.id,
      terms: [card.title, card.text, keywords[card.id]].join(' '),
    })),
  ]);
  const normalize = (value) => value.toLowerCase().replaceAll('ё', 'е');
  search.addEventListener('input', function () {
    const query = normalize(search.value.trim());
    const matches = query
      ? entries.filter((entry) =>
          query.split(/\s+/).every((word) => normalize(entry.terms).includes(word)),
        )
      : [];
    document.getElementById('search-results').innerHTML = matches
      .map((entry) => `<li><a href="${entry.href}">${escapeHtml(entry.title)}</a></li>`)
      .join('');
    document.getElementById('search-status').textContent = query
      ? matches.length
        ? `Найдено: ${matches.length}`
        : 'Ничего не найдено.'
      : '';
  });
}

const helpButton = document.getElementById('open-help');
if (helpButton) {
  helpButton.addEventListener('click', function () {
    document.getElementById('help-dialog').showModal();
  });
}

// Темы проживания
const residenceMenu = document.querySelector('.residence-menu');
if (residenceMenu) {
  residenceMenu.addEventListener('click', function (event) {
    const button = event.target.closest('[data-topic]');
    if (!button) return;
    for (const item of residenceMenu.querySelectorAll('button')) {
      item.setAttribute('aria-pressed', String(item === button));
    }
    for (const topic of document.querySelectorAll('.residence-panel')) {
      topic.hidden = topic.id !== 'topic-' + button.dataset.topic;
    }
  });
}

// Кнопка наверх
const backToTop = document.querySelector('.back-to-top');
function toggleBackToTop() {
  if (backToTop) backToTop.hidden = window.scrollY < 400;
}
window.addEventListener('scroll', toggleBackToTop, { passive: true });
window.addEventListener('pageshow', toggleBackToTop);
toggleBackToTop();
