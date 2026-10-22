export const STATUSES = {
  draft: 'Черновик', submitted: 'Отправлена', reviewing: 'На рассмотрении',
  needs_info: 'Нужно дополнить', offered: 'Предложены условия', approved: 'Одобрено',
  declined: 'Отказано', accepted: 'Условия приняты', issued: 'Выдача смоделирована', withdrawn: 'Отозвана вами',
};
export const editable = a => ['draft', 'needs_info'].includes(a.status);
export function readiness(a) {
  return [
    { key: 'company', label: 'Компания и реквизиты', ok: !!a.company?.trim() && /^\d{10}(\d{2})?$/.test(a.inn || '') },
    { key: 'parameters', label: 'Цель, сумма и срок', ok: !!a.purpose?.trim() && Number(a.amount) >= 100000 && Number(a.amount) <= 30000000 && Number.isInteger(Number(a.months)) && Number(a.months) >= 1 && Number(a.months) <= 60 },
    { key: 'finance', label: 'Финансовые показатели подтверждены', ok: Number(a.revenue) > 0 && a.expenses !== '' && Number(a.expenses) >= 0 && a.confirmed === true },
    { key: 'document', label: 'Выписка за последний полный месяц', ok: a.documents?.some(d => d.kind === 'statement' && d.state !== 'invalid') || false },
  ];
}
export function validateFile(file) {
  if (!file || !file.name?.toLowerCase().endsWith('.pdf') || !['application/pdf', ''].includes(file.type)) throw new Error('Выберите PDF-файл.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Размер файла должен быть от 1 байта до 10 МБ.');
}
export function nextState(a, command, payload = {}) {
  const allowed = {
    submit: ['draft', 'needs_info'], review: ['submitted'], request: ['reviewing'],
    approve: ['reviewing'], decline: ['reviewing'], offer: ['reviewing'],
    accept: ['offered', 'approved'], reject_offer: ['offered'], issue: ['accepted'],
    withdraw: ['draft', 'submitted', 'reviewing', 'needs_info', 'offered', 'approved'],
  };
  if (!allowed[command]?.includes(a.status)) throw new Error('Действие недоступно в текущем статусе. Обновите заявку.');
  if (command === 'submit' && readiness(a).some(x => !x.ok)) throw new Error('Заполните сведения и приложите выписку перед отправкой.');
  if (command === 'submit' && a.status === 'needs_info' && !a.request?.resolved) throw new Error('Выполните запрос банка перед повторной отправкой.');
  if (['request', 'decline'].includes(command) && !payload.reason?.trim()) throw new Error('Укажите понятную причину для клиента.');
  if (command === 'offer' && (!(Number(payload.amount) >= 100000) || Number(payload.amount) > Number(a.amount) || !Number.isInteger(Number(payload.months)) || Number(payload.months) < 1 || Number(payload.months) > 60)) throw new Error('Проверьте предложенную сумму и срок.');
  if (command === 'accept' && payload.offerVersion !== a.offer?.version) throw new Error('Условия изменились. Ознакомьтесь с актуальной версией.');
  return { submit: 'submitted', review: 'reviewing', request: 'needs_info', approve: 'approved', decline: 'declined', offer: 'offered', accept: 'accepted', reject_offer: 'withdrawn', issue: 'issued', withdraw: 'withdrawn' }[command];
}
