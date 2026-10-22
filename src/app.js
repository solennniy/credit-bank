import { api } from './demo-api.js';
import { STATUSES, readiness, editable } from './domain.js';
const app = document.querySelector('#app');
let role = sessionStorage.getItem('demo-role') || 'client';
let current, busy = false, renderVersion = 0;
const money = n => new Intl.NumberFormat('ru-RU').format(Number(n)) + ' ₽';
const date = s => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const button = (label, action, secondary = false, extra = '') => `<button type="button" class="${secondary ? 'secondary' : 'primary'}" data-action="${action}" ${extra}>${label}</button>`;
const link = (label, hash, cls = 'secondary') => `<a class="button ${cls}" href="#${hash}">${label}</a>`;
const status = a => `<span class="status ${a.status}">${STATUSES[a.status]}</span>`;
function notice(message) { const t = document.querySelector('#toast'); t.textContent = message; t.classList.add('visible'); clearTimeout(notice.timer); notice.timer = setTimeout(() => t.classList.remove('visible'), 5000); }
function shell(content, landing = false) {
  return `<header><a class="brand" href="#home"><img src="/public/assets/alfa.svg" alt="" width="28" height="40">Альфа-Бизнес</a><span class="header-context">${role === 'bank' ? 'Рабочее место банка' : 'Кредитный кабинет'}</span><label class="role">Демороль <select id="role"><option value="client" ${role === 'client' ? 'selected' : ''}>Клиент</option><option value="bank" ${role === 'bank' ? 'selected' : ''}>Сотрудник банка</option></select></label></header>${landing ? content : `<div class="workspace"><aside><p class="eyebrow">${role === 'bank' ? 'Банк' : 'Мой бизнес'}</p><a href="#list" ${location.hash === '#list' ? 'aria-current="page"' : ''}>${role === 'bank' ? 'Заявки' : 'Мои заявки'}</a><a href="#documents">Документы</a><a href="#history">История</a><a href="#settings">Демонстрация</a><p class="aside-note">ООО «Маяк»<br>Синтетические данные</p></aside><main id="main" tabindex="-1">${content}</main></div>`}`;
}
function home() {
  return shell(`<main id="main" class="landing"><section class="hero"><div><h1>Финансирование<br>для вашего бизнеса</h1><p>От задачи бизнеса до решения по заявке.<br>Понятные требования, документы и следующие шаги — в одном кабинете.</p><div class="actions">${button('Подобрать финансирование', 'create')}${link('Мои заявки', 'list', 'dark-secondary')}</div><small>Демонстрационный сервис · не предложение банка</small></div><img class="wallet" src="/public/assets/wallet.png" alt="Красный кошелёк с банкнотами" width="564" height="461"></section><section class="benefits">${[['Под вашу задачу', 'Закупки, расходы и развитие'], ['Требования заранее', 'Понятный список документов'], ['Без потери данных', 'Черновик в этом браузере'], ['Всегда понятен шаг', 'Статус и действия в кабинете']].map(([a,b]) => `<article><h3>${a}</h3><p>${b}</p></article>`).join('')}</section><section class="light"><h2>Подберите финансирование<br>под задачу бизнеса</h2><div class="calculator"><div><label class="field">Цель финансирования<select id="calc-purpose"><option>Закупка товара</option><option>Текущие расходы</option><option>Развитие бизнеса</option></select></label><label class="field">Сумма<input id="calc-amount" type="number" value="1000000" min="100000" max="30000000" step="10000"></label><label class="field">Срок, месяцев<input id="calc-months" type="number" value="12" min="1" max="60"></label></div><article class="card"><h3>Оборотный кредит</h3><p>Для закупки товара и текущих расходов.</p><h4>Понадобятся</h4><p>Данные компании<br>Финансовые показатели<br>Выписка по счёту</p>${button('Перейти к заявке', 'create')}<small>Подбор не означает одобрение. Условия демонстрационные.</small></article></div><h2>Как получить результат по заявке</h2><div class="steps">${[['Выберите задачу', 'Укажите цель, сумму и срок.'], ['Заполните заявку', 'Добавьте данные и документы.'], ['Пройдите проверку', 'Дополните сведения при запросе.'], ['Получите результат', 'Узнайте решение и следующий шаг.']].map(([a,b],i)=>`<article><h3>0${i+1} / ${a}</h3><p>${b}</p></article>`).join('')}</div></section><footer><h3>Альфа-Хак / учебный MVP</h3><p>Данные сохраняются только в браузере. Нет настоящего входа, банковских проверок и переводов.</p></footer></main>`, true);
}
function heading(title, sub = '') { return `<h1>${title}</h1><p class="lead">${sub}</p>`; }
async function list() {
  const rows = await api.list(role);
  return heading(role === 'bank' ? 'Заявки на финансирование' : 'Мои заявки', 'ООО «Маяк» · демонстрационная среда') + `<div class="toolbar">${role === 'client' ? button('Новая заявка', 'create') : ''}<label>Статус <select id="filter"><option value="all">Все заявки (${rows.length})</option>${Object.entries(STATUSES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label></div><div class="cards" id="application-list">${rows.map(a=>`<article class="card application" data-status="${a.status}">${status(a)}<h2>${esc(a.number || 'Черновик')}</h2><p>${esc(a.company)}</p><p>${money(a.amount)} · ${a.months} месяцев</p><p class="next">${esc(nextAction(a))}</p>${link(a.status === 'draft' ? 'Продолжить заполнение' : 'Открыть заявку', `app/${a.id}`)}<small>Обновлено ${date(a.updatedAt)}</small></article>`).join('') || '<article class="card"><h2>Пока нет заявок</h2><p>Новые заявки появятся здесь после отправки клиентом.</p></article>'}</div><p id="filter-empty" hidden>В этом статусе заявок нет.</p>`;
}
function nextAction(a) {
  return { draft: 'Продолжите заполнение и добавьте документы.', needs_info: a.request?.reason, submitted: 'Банк ещё не начал рассмотрение.', reviewing: 'Сейчас действий от клиента не требуется.', offered: 'Сравните и примите предложенные условия.', approved: 'Ознакомьтесь с условиями.', declined: a.declineReason, accepted: 'Ожидаем демонстрационную выдачу.', issued: 'Оформление завершено. Реального перевода не было.', withdrawn: 'Заявка закрыта по решению клиента.' }[a.status] || '';
}
function fields(a) {
  const input = (name, label, type = 'text', attrs = '') => `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(a[name])}" ${attrs}></label>`;
  return `<form id="application-form"><div class="card"><h2>Данные компании</h2><p>Источник: демопрофиль. Проверьте актуальность перед отправкой.</p>${input('company', 'Название компании', 'text', 'required maxlength="160"')}${input('inn', 'ИНН · синтетический пример', 'text', 'required pattern="[0-9]{10}([0-9]{2})?" inputmode="numeric"')}<div class="grid2">${input('amount', 'Сумма, ₽', 'number', 'required min="100000" max="30000000"')}${input('months', 'Срок, месяцев', 'number', 'required min="1" max="60" step="1"')}</div>${input('purpose', 'Цель финансирования', 'text', 'required maxlength="200"')}<div class="grid2">${input('revenue', 'Выручка в месяц, ₽', 'number', 'required min="1"')}${input('expenses', 'Расходы в месяц, ₽', 'number', 'required min="0"')}</div><label class="check"><input name="confirmed" type="checkbox" ${a.confirmed ? 'checked' : ''}> Подтверждаю актуальность показанных сведений</label><div class="actions"><button class="primary" type="submit">Сохранить и проверить</button><button class="secondary" type="button" data-action="save-draft">Сохранить черновик</button></div><small id="save-state">Изменения сохраняются по кнопке. ${a.updatedAt ? 'Последнее сохранение: ' + date(a.updatedAt) : ''}</small></div></form>`;
}
function documentPanel(a) {
  return `<section class="card"><h2>Документы</h2>${a.documents.map(d=>`<div class="doc"><div><strong>${esc(d.name)}</strong><p>${d.kind === 'statement' ? 'Выписка' : 'Отчёт о доходах'} · ${Math.ceil(d.size / 1024)} КБ · ${d.state === 'invalid' ? 'Нужно заменить' : 'Добавлен'}</p></div></div>`).join('') || '<p>Документы пока не добавлены.</p>'}${editable(a) && role === 'client' ? `<label class="field">Тип документа<select id="doc-kind"><option value="statement">Выписка по счёту</option><option value="income" ${a.request?.kind === 'income' ? 'selected' : ''}>Отчёт о доходах</option></select></label><label class="file">Добавить или заменить PDF<input id="document-file" type="file" accept="application/pdf,.pdf"></label><small>PDF до 10 МБ. В демо сохраняются только имя, размер и статус файла; содержимое не хранится.</small>` : '<p>В браузерном демо содержимое документов недоступно. Бэкендер подключит безопасное хранилище.</p>'}</section>`;
}
function readinessPanel(a) {
  const checks = readiness(a), ready = checks.every(c=>c.ok) && (a.status !== 'needs_info' || a.request?.resolved);
  return `<section class="card"><h2>Проверка готовности · ${checks.filter(c=>c.ok).length} из ${checks.length}</h2><ul class="checks">${checks.map(c=>`<li class="${c.ok ? 'ok' : 'error'}">${c.ok ? '✓' : '•'} ${c.label}${c.ok ? '' : ' — нужно заполнить'}</li>`).join('')}</ul>${a.status === 'needs_info' ? `<p class="${a.request?.resolved ? 'ok' : 'error'}">${a.request?.resolved ? 'Запрошенный документ добавлен' : esc(a.request?.reason)}</p>` : ''}${button(a.status === 'needs_info' ? 'Отправить дополнение' : 'Отправить заявку', 'submit', false, ready ? '' : 'disabled')}<small>${ready ? 'Проверка комплектности не означает одобрение кредита.' : 'Сохраните сведения и приложите документы — затем отправка станет доступна.'}</small></section>`;
}
function offerPanel(a) {
  if (!a.offer) return '';
  return `<section class="card"><h2>Предложение № ${a.offer.version} · демо</h2><div class="grid2"><div><h3>Вы запросили</h3><p>${money(a.amount)} · ${a.months} месяцев</p></div><div><h3>Банк предложил</h3><p>${money(a.offer.amount)} · ${a.offer.months} месяцев</p></div></div><p>Ставка, платёж и полная стоимость в этом прототипе не рассчитываются. Это не кредитная оферта.</p>${role === 'client' && ['approved', 'offered'].includes(a.status) ? `<div class="actions">${button('Принять условия · демо', 'accept')}${a.status === 'offered' ? button('Отказаться от предложения', 'reject_offer', true) : ''}</div>` : ''}${a.status === 'accepted' ? '<p class="ok">Принята актуальная версия. Выдача ещё не подтверждена.</p>' : ''}</section>`;
}
function bankPanel(a) {
  if (role !== 'bank') return '';
  if (a.status === 'submitted') return `<section class="card"><h2>Новая заявка</h2>${button('Взять на рассмотрение', 'review')}</section>`;
  if (a.status === 'accepted') return `<section class="card"><h2>Подготовка к выдаче</h2><p>Клиент принял версию № ${a.acceptedOfferVersion}. Подписание договора и перевод средств только моделируются.</p>${button('Смоделировать выдачу', 'issue')}</section>`;
  if (a.status !== 'reviewing') return '';
  return `<section class="card"><h2>Действие сотрудника банка</h2><p>Документы и финансовые сведения проверяются сотрудником вручную в рамках демосценария.</p><label class="field">Причина или запрос клиенту<textarea id="bank-reason" rows="3" placeholder="Укажите, что требуется исправить или почему принято решение"></textarea></label><label class="field">Запрашиваемый документ<select id="request-kind"><option value="statement">Выписка по счёту</option><option value="income">Отчёт о доходах</option></select></label><label class="check"><input id="invalid-document" type="checkbox"> Приложенный документ не подходит — нужна замена</label><div class="actions">${button('Запросить документ', 'request', true)}${button('Отказать с причиной', 'decline', true)}</div><h3>Решение и предложение</h3><div class="grid2"><label class="field">Предлагаемая сумма, ₽<input id="offer-amount" type="number" value="${a.amount}" min="100000" max="${a.amount}"></label><label class="field">Срок, месяцев<input id="offer-months" type="number" value="${a.months}" min="1" max="60"></label></div><div class="actions">${button('Одобрить · демо', 'approve')}${button('Предложить другие условия', 'offer', true)}</div></section>`;
}
function timeline(a) {
  return `<section class="card"><h2>История заявки</h2><ol class="timeline">${[...a.events].reverse().map(e=>`<li class="${e.internal ? 'internal' : ''}"><small>${date(e.at)} · ${e.internal ? 'Только банку' : e.role === 'bank' ? 'Банк' : 'Клиент'}</small><p>${esc(e.label)}</p></li>`).join('')}</ol></section>`;
}
async function detail(id) {
  current = await api.get(id, role); const a = current;
  const summary = `<section class="card"><h2>${esc(a.company)}</h2><p>${esc(a.purpose)}</p><strong class="amount">${money(a.amount)}</strong><p>Срок: ${a.months} месяцев</p><p>Выручка: ${money(a.revenue)}<br>Расходы: ${money(a.expenses)}</p><small>Обновлено ${date(a.updatedAt)}</small>${role === 'client' && ['draft','submitted','reviewing','needs_info','offered','approved'].includes(a.status) ? button('Отозвать заявку', 'withdraw', true) : ''}</section>`;
  return `<a class="back" href="#list">← К заявкам</a>${heading(esc(a.number || 'Черновик'), esc(nextAction(a)))}${status(a)}<div class="detail"><div class="stack">${role === 'client' && editable(a) ? fields(a) : ''}${a.request && a.status === 'needs_info' ? `<section class="card attention"><h2>Нужны сведения от клиента</h2><p>${esc(a.request.reason)}</p></section>` : ''}${documentPanel(a)}${role === 'client' && editable(a) ? readinessPanel(a) : ''}${offerPanel(a)}${a.status === 'declined' ? `<section class="card"><h2>Отказ по заявке</h2><p>${esc(a.declineReason)}</p>${button('Подготовить новую заявку', 'create', true)}</section>` : ''}${a.status === 'issued' ? '<section class="card"><h2>Оформление завершено</h2><p>Выдача смоделирована. Реального перевода денег не было.</p></section>' : ''}${bankPanel(a)}${timeline(a)}</div><div class="stack">${summary}<section class="card"><h3>Демонстрационный режим</h3><p>Переключите демороль вверху, чтобы продолжить процесс со стороны банка или клиента.</p><small>Нет настоящей авторизации. Используйте только вымышленные сведения.</small></section></div></div>`;
}
async function render() {
  if (busy) return;
  const version = ++renderVersion; current = null;
  const route = location.hash.slice(1) || 'home';
  try {
    let content;
    if (route === 'home') { app.innerHTML = home(); return; }
    if (route.startsWith('app/')) content = await detail(route.slice(4));
    else if (['documents', 'history'].includes(route)) {
      const rows = await api.list(role);
      content = heading(route === 'history' ? 'История заявок' : 'Документы', 'Выберите заявку, чтобы увидеть её сведения.') + `<div class="cards">${rows.map(a=>`<article class="card"><h2>${esc(a.number || 'Черновик')}</h2><p>${esc(a.company)}</p><p>${route === 'documents' ? `Документов: ${a.documents.length}` : esc(STATUSES[a.status])}</p>${link('Открыть заявку', `app/${a.id}`)}</article>`).join('') || '<p>Заявок пока нет.</p>'}</div>`;
    } else if (route === 'settings') content = heading('Демонстрация') + `<section class="card"><h2>Данные только в этом браузере</h2><p>Демороль не защищает доступ. Клиент и банк — представления одного браузерного сценария. Никакие данные не отправляются на сервер.</p><div class="actions">${button('Экспортировать демоданные', 'export')}${button('Сбросить демонстрацию', 'reset', true)}</div></section>`;
    else content = await list();
    if (version === renderVersion) app.innerHTML = shell(content);
  } catch (e) { app.innerHTML = shell(heading('Не удалось открыть страницу') + `<section class="card"><p role="alert">${esc(e.message)}</p>${link('Настройки демонстрации','settings')}</section>`); }
}
async function saveForm() {
  const form = document.querySelector('#application-form');
  if (!form || !current) return;
  const f = Object.fromEntries(new FormData(form));
  for (const key of ['amount','months','revenue','expenses']) f[key] = f[key] === '' ? '' : Number(f[key]);
  f.confirmed = !!form.querySelector('[name="confirmed"]').checked;
  current = await api.save(current.id, current.version, f);
}
async function command(name) {
  if (!current) return;
  const payload = { reason: document.querySelector('#bank-reason')?.value, kind: document.querySelector('#request-kind')?.value, invalid: document.querySelector('#invalid-document')?.checked, amount: document.querySelector('#offer-amount')?.value, months: document.querySelector('#offer-months')?.value, offerVersion: current.offer?.version };
  if (name === 'submit') payload.operationId = current.id + ':' + current.version;
  const confirmations = { withdraw: 'Отозвать заявку и остановить рассмотрение?', decline: 'Зафиксировать отказ с указанной причиной?', approve: 'Одобрить заявку в демонстрационном режиме?', offer: 'Отправить клиенту эти условия?', accept: 'Принять показанную версию демонстрационных условий?', reject_offer: 'Отказаться от предложения?', issue: 'Смоделировать выдачу без перевода денег?' };
  if (confirmations[name] && !window.confirm(confirmations[name])) return;
  await api.command(current.id, current.version, role, name, payload);
  notice(name === 'issue' ? 'Выдача смоделирована' : 'Действие сохранено');
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action]'); if (!b || busy) return;
  const action = b.dataset.action; busy = true; b.disabled = true;
  try {
    if (action === 'create') {
      if (role === 'bank') { role = 'client'; sessionStorage.setItem('demo-role', role); }
      let a = await api.create();
      if (document.querySelector('#calc-amount')) a = await api.save(a.id, a.version, { purpose: document.querySelector('#calc-purpose').value, amount: Number(document.querySelector('#calc-amount').value), months: Number(document.querySelector('#calc-months').value) });
      location.hash = 'app/' + a.id;
    } else if (action === 'save-draft') { await saveForm(); notice('Черновик сохранён'); }
    else if (action === 'reset') { if (confirm('Удалить все демозаявки этого браузера и восстановить примеры?')) { await api.reset(); location.hash = 'list'; } }
    else if (action === 'export') { const u = URL.createObjectURL(new Blob([await api.export()], { type: 'application/json' })); const a = document.createElement('a'); a.href = u; a.download = 'credit-bank-demo.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000); }
    else await command(action);
  } catch (e) { notice(e.message); }
  finally { busy = false; await render(); }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'application-form') return; e.preventDefault(); if (busy) return; busy = true;
  try { await saveForm(); notice('Сведения сохранены. Проверьте комплектность заявки.'); } catch (e) { notice(e.message); }
  finally { busy = false; await render(); }
});
document.addEventListener('change', async e => {
  if (e.target.id === 'role') { role = e.target.value; sessionStorage.setItem('demo-role',role); location.hash = 'list'; await render(); }
  if (e.target.id === 'filter') { let shown = 0; document.querySelectorAll('.application').forEach(n=>{ n.hidden = e.target.value !== 'all' && n.dataset.status !== e.target.value; if (!n.hidden) shown++; }); document.querySelector('#filter-empty').hidden = shown > 0; }
  if (e.target.id === 'document-file' && e.target.files[0] && current && !busy) {
    busy = true;
    try { await saveForm(); await api.upload(current.id, current.version, e.target.files[0], document.querySelector('#doc-kind').value); notice('Документ добавлен в демозаявку'); }
    catch (e) { notice(e.message); }
    finally { busy = false; await render(); }
  }
});
document.addEventListener('input', e => { if (e.target.closest('#application-form')) { const n = document.querySelector('#save-state'); if (n) n.textContent = 'Есть несохранённые изменения. Нажмите «Сохранить черновик».'; } });
window.addEventListener('beforeunload', e => { if (document.querySelector('#save-state')?.textContent.startsWith('Есть несохранённые')) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('hashchange', render);
window.addEventListener('storage', e => { if (e.key === 'credit-bank-demo-v1') notice('Данные изменились в другой вкладке. Обновите страницу перед следующим действием.'); });
render();
