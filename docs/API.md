# Контракт для подключения бэкенда

Текущая реализация — интерфейс и браузерный адаптер. Маршруты ниже — **предлагаемый контракт**, не существующие серверные endpoints.

## Методы адаптера

| Метод | Предлагаемый HTTP endpoint | Результат |
|---|---|---|
| list(role) | GET /api/applications | Application[] |
| get(id, role) | GET /api/applications/{id} | Application |
| create() | POST /api/applications | черновик |
| save(id, version, fields) | PATCH /api/applications/{id} | Application |
| upload(id, version, file, kind) | POST /api/applications/{id}/documents | Application |
| command(id, version, role, command, payload) | POST /api/applications/{id}/actions | Application |

Роль не должна передаваться как доверенный параметр реальному API. Сервер определяет пользователя, компанию и роль из защищённой сессии. В HTTP-адаптере параметр role нужен только интерфейсу, сервер его игнорирует.

## Данные

Application: id, number, company, inn, purpose, amount (целые рубли в этом демо), months, revenue, expenses, confirmed, status, version, documents[], events[], createdAt, updatedAt, request?, offer?, acceptedOfferVersion?, declineReason?.

Document: id, name, size, kind (`statement` / `income`), state (`received` / `invalid`), at. Серверное хранилище файлов нужно подключить отдельно. Браузерный адаптер хранит лишь метаданные и не может вернуть файл.

Event: id, at (ISO UTC), label, role, internal. Клиентский ответ сервера не должен содержать internal-события, даже скрытые визуально.

Offer: amount, months, version. Для реального предложения расширить ставкой, полной стоимостью, графиком и сроком действия; пока эти значения не рассчитываются.

Command: submit, review, request, approve, decline, offer, accept, reject_offer, issue, withdraw.

Payload: reason, kind, invalid, amount, months, offerVersion, operationId — только поля конкретного действия. `version` заявки обязателен для изменений, конфликт возвращает 409. Неверные данные — 422; отсутствие входа — 401; отсутствие прав — 403; ненайденная заявка — 404. Ошибка: `{error:{code,message,fields?,requestId}}`; адаптер преобразует её в Error с понятным message.

## Обязательные серверные свойства

- Проверка доступа к каждой заявке и файлу по компании/роли; защита сессий и CSRF.
- Валидация всех полей и переходов на сервере; браузерные проверки не являются защитой.
- Транзакционная запись состояния и истории, optimistic locking по version.
- Idempotency-Key на отправке и выдаче; после таймаута — сверка результата, не повторная выдача.
- Проверка версии принятого предложения до выдачи.
- Ограничение размера/содержимого файла, безопасное имя, хранение вне публичной директории, проверка файлов и авторизованное скачивание.
- Отдельные публичные и служебные события; причины решения, автор и время фиксируются сервером.
- Пагинация списка, серверная фильтрация, ограничения частоты и понятные ошибки.

После подключения сервера удалить демосброс/экспорт и переключатель ролей либо оставить их только в изолированном тестовом окружении. localStorage не использовать для реальных документов, финансовых данных или session tokens.
