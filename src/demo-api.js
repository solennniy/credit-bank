// Replace this module with an HTTP adapter; view code uses only the exported api contract.
// Demo role selection is NOT authentication. Never put real personal or financial data here.
import { nextState, validateFile, editable } from './domain.js';
const KEY = 'credit-bank-demo-v1';
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
function event(a, label, role = 'client', internal = false) {
  a.events.push({ id: uid(), at: now(), label, role, internal });
}
function blank() {
  const a = { id: uid(), number: '', company: 'ООО «Маяк»', inn: '0000000000', purpose: 'Закупка товара', amount: 1000000, months: 12, revenue: 800000, expenses: 500000, confirmed: false, status: 'draft', version: 1, documents: [], events: [], createdAt: now(), updatedAt: now() };
  event(a, 'Создан черновик'); return a;
}
function initial() {
  const a = blank(); a.number = 'АЛ-001'; a.status = 'needs_info'; a.confirmed = true;
  a.documents = [{ id: uid(), name: 'выписка_сентябрь.pdf', size: 148000, kind: 'statement', state: 'received', at: now() }];
  a.request = { reason: 'Добавьте отчёт о доходах за последний полный месяц.', kind: 'income', resolved: false };
  event(a, 'Заявка принята'); event(a, 'Банк начал рассмотрение', 'bank'); event(a, a.request.reason, 'bank');
  return [a, blank()];
}
function read() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const data = JSON.parse(raw); if (!Array.isArray(data)) throw new Error(); return data; } }
  catch { throw new Error('Не удалось прочитать демоданные браузера. Экспортируйте данные или сбросьте демонстрацию в настройках.'); }
  const data = initial(); write(data); return data;
}
function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch { throw new Error('Браузер не смог сохранить изменения. Проверьте доступное место и разрешение хранилища.'); }
}
function transaction(id, version, fn) {
  const all = read(), a = all.find(x => x.id === id);
  if (!a) throw new Error('Заявка не найдена.');
  if (version !== a.version) throw new Error('Заявка изменилась в другой вкладке. Обновите её перед действием.');
  fn(a, all); a.version += 1; a.updatedAt = now(); write(all); return structuredClone(a);
}
function visible(a, role) {
  const copy = structuredClone(a);
  copy.events = copy.events.filter(e => role === 'bank' || !e.internal);
  return copy;
}
export const api = {
  async list(role) { return read().filter(a => role !== 'bank' || a.status !== 'draft').map(a => visible(a, role)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); },
  async get(id, role) { const a = read().find(a => a.id === id); if (!a) throw new Error('Заявка не найдена.'); return visible(a, role); },
  async create() { const all = read(), a = blank(); all.push(a); write(all); return a; },
  async save(id, version, fields) {
    return transaction(id, version, a => {
      if (!editable(a)) throw new Error('Редактирование доступно только в черновике или при уточнении.');
      for (const key of ['company', 'inn', 'purpose', 'amount', 'months', 'revenue', 'expenses', 'confirmed']) if (key in fields) a[key] = fields[key];
    });
  },
  async upload(id, version, file, kind = 'statement') {
    validateFile(file);
    if (new TextDecoder().decode((await file.arrayBuffer()).slice(0, 5)) !== '%PDF-') throw new Error('Содержимое файла не похоже на PDF. Выберите другой документ.');
    return transaction(id, version, a => {
      if (!editable(a)) throw new Error('Сейчас документы нельзя менять.');
      a.documents = a.documents.filter(d => d.kind !== kind);
      a.documents.push({ id: uid(), name: file.name, size: file.size, kind, state: 'received', at: now() });
      if (a.request && a.request.kind === kind) a.request.resolved = true;
      event(a, `Добавлен документ: ${file.name}`);
    });
  },
  async command(id, version, role, command, payload = {}) {
    const prior = read().find(a => a.id === id);
    if (command === 'submit' && payload.operationId && prior?.submissionOperation === payload.operationId) return visible(prior, role);
    return visible(transaction(id, version, (a, all) => {
      const bank = ['review', 'request', 'approve', 'decline', 'offer', 'issue'];
      if ((bank.includes(command) ? 'bank' : 'client') !== role) throw new Error('Переключитесь на соответствующую демороль.');
      const status = nextState(a, command, payload);
      if (command === 'submit') { a.number ||= `АЛ-${String(all.filter(x => x.number).length + 1).padStart(3, '0')}`; a.submissionOperation = payload.operationId; }
      if (command === 'request') {
        a.request = { reason: payload.reason.trim(), kind: payload.kind || 'statement', resolved: false };
        if (payload.invalid) a.documents.filter(d => d.kind === a.request.kind).forEach(d => d.state = 'invalid');
      }
      if (['offer', 'approve'].includes(command)) a.offer = { amount: command === 'approve' ? Number(a.amount) : Number(payload.amount), months: command === 'approve' ? Number(a.months) : Number(payload.months), version: (a.offer?.version || 0) + 1 };
      if (command === 'accept') a.acceptedOfferVersion = payload.offerVersion;
      if (command === 'issue' && a.acceptedOfferVersion !== a.offer?.version) throw new Error('Актуальная версия условий не принята.');
      if (command === 'decline') a.declineReason = payload.reason.trim();
      a.status = status;
      const labels = { submit: 'Заявка отправлена', review: 'Банк начал рассмотрение', request: `Запрос банка: ${payload.reason || ''}`, approve: 'Заявка одобрена · демо', decline: `Отказ: ${payload.reason || ''}`, offer: 'Банк предложил другие условия', accept: 'Клиент принял условия', reject_offer: 'Клиент отказался от предложения', issue: 'Выдача смоделирована. Реального перевода не было', withdraw: 'Клиент отозвал заявку' };
      event(a, labels[command], role);
      if (role === 'bank') event(a, `Демо-специалист: ${command}`, role, true);
    }), role);
  },
  async export() { return JSON.stringify(read(), null, 2); },
  async reset() { const data = initial(); write(data); },
};
