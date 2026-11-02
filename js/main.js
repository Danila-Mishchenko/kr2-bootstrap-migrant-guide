'use strict';
const guide = window.Guide;
const panel = document.getElementById('questionnaire');
const form = document.getElementById('guide-form');
const questionsBox = document.getElementById('questions');
const documentsBox = document.getElementById('document-choices');
const result = document.getElementById('result');
const answerButton = document.getElementById('answer-button');
let currentCard;
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
    document.title = currentCard.title + ' — Справка для Иностранцев';
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

if (form)
  form.addEventListener('change', function (event) {
    const field = event.target;
    if (field.dataset.document) {
      owned[field.dataset.document] = field.value === 'yes';
      result.hidden = true;
    } else if (field.name) {
      answers[field.name] = field.value;
      renderQuestions();
      document.getElementById(field.id).focus({ preventScroll: true });
    }
  });

// Ответ
if (form)
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (answerButton.disabled || !form.reportValidity()) return;
    const selected = guide.plan(currentCard.id, answers);
    let html = '';
    let ready = 0;
    for (const id of selected.ids) {
      const document = guide.documents[id];
      const status = owned[id] ? 'Уже есть' : 'Подготовить / уточнить применимость';
      if (owned[id]) ready++;
      html += `<div class="result__item${owned[id] ? ' result__item--ready' : ''}">
      <h5>${escapeHtml(document[0])}</h5>
      <p class="result__state">${status}</p>
      <p>${escapeHtml(document[1])}</p></div>`;
    }
    document.getElementById('result-documents').innerHTML = html;
    document.getElementById('result-count').textContent =
      `Уже есть: ${ready} из ${selected.ids.length}. Осталось подготовить или уточнить: ${selected.ids.length - ready}.`;
    document.getElementById('result-notes').innerHTML = selected.notes
      .map(function (note) {
        return '<p>' + escapeHtml(note) + '</p>';
      })
      .join('');
    result.hidden = false;
    document.getElementById('result-title').focus({ preventScroll: true });
    result.scrollIntoView();
  });

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
