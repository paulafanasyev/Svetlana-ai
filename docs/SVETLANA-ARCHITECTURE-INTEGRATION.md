# Светлана 2.0 — архитектура интеграции

**Целевой репозиторий:** `paulafanasyev/Svetlana-ai`  
**Исходный проект:** `TencentCloud/Octop`  
**Рабочая ветка:** `svetlana-pilot`  
**Статус документа:** архитектурное решение и план реализации; не является подтверждением runtime-готовности.

## 1. Целевая схема

```text
TencentCloud/Octop (upstream, MIT)
          |
          | fork
          v
paulafanasyev/Svetlana-ai
          |
          +-- Octop Core
          +-- Persistent Task Queue
          +-- Orkas Specialists + Commander concepts
          +-- OpenBot Security / approvals concepts
          +-- selected ApmixBot capabilities (only if source/license verified)
          +-- Svetlana 2.0 UI, identity, memory and workflows
```

Octop остаётся единственным базовым backend/runtime. Не запускаем параллельно второй агентный runtime ради копирования функций. Интеграции должны идти через существующие сервисы, интерфейсы и модели Octop.

## 2. Подтверждённое состояние репозитория на момент проверки

- GitHub API подтверждает, что `paulafanasyev/Svetlana-ai` — публичный fork; `parent` и `source` — `TencentCloud/Octop`.
- Default branch: `main`; рабочая ветка: `svetlana-pilot`.
- На момент проверки `svetlana-pilot` опережала `main` на 14 коммитов и не отставала от неё.
- В репозитории нет открытых PR на момент проверки.
- Ветка `svetlana-pilot` содержит план пилота и начальную RU/VI/EN/ZH локализацию. RU и VI словари пока неполные.
- Octop уже содержит экспертов/subagents, AgentTeams (Beta), skills, MCP/connectors, memory, cron jobs, user permissions, audit log и security policy store.
- `TeamJobTracker` в `src/octop/infra/agents/teams/jobs.py` — in-process tracker. Его состояние теряется при перезапуске; комментарий в коде прямо указывает, что roster locks не переживают reboot.
- Cron jobs уже используют репозиторий БД, статусы запусков, lease token и audit events. Это полезный внутренний образец, но cron scheduler не заменяет общую очередь длительных агентных задач.
- Текущая настройка security policy по умолчанию отключает HITL (`hitl.enabled = false`) и задаёт tool guard в режиме `warn`. Для Светланы это не должно считаться достаточным production-профилем.
- Octop и Orkas, а также выбранный кандидат CopilotKit/OpenBot опубликованы под MIT. Для каждого переносимого файла/модуля всё равно сохранять copyright/license notices и проверять зависимости.

## 3. Разделение ответственности

| Подсистема | Базовая ответственность | Решение интеграции |
|---|---|---|
| Octop Core | API, auth, DB, agents, tools, skills, memory, MCP, UI | Оставить единственным runtime |
| Persistent Task Queue | Durable task lifecycle, recovery, retries, concurrency | Реализовать в Octop DB/repository/service слоях |
| Orkas | Commander workflow и 16 специализированных ролей | Переносить роли/skill-пакеты как Octop experts, не desktop runtime |
| OpenBot | Tool governance, action-bound approvals, audit, execution boundaries | Заимствовать проверенные security patterns; не переносить весь OpenBot |
| ApmixBot | Полезные specialist/workflow/MCP patterns | BLOCKED до подтверждения исходного репозитория, исходников и лицензии |
| Svetlana | RU-first UI, identity, assistant profile, user-facing workflows | Развивать внутри Octop dashboard/backend |

## 4. Постоянная очередь задач — целевая модель

### 4.1 Хранение

Использовать ту же поддерживаемую БД Octop (SQLite и PostgreSQL) и парные SQL migrations. Не добавлять Redis/Celery как обязательную инфраструктуру на первом этапе: сначала проверить, что можно надёжно реализовать на существующем DB layer.

Предлагаемые сущности:

- `agent_tasks`: id, owner_user_id, workspace_id, task_type, payload_json, status, priority, idempotency_key, attempts, max_attempts, available_at, created_at, updated_at, started_at, finished_at.
- `agent_task_leases`: task_id, worker_id, lease_token, leased_at, heartbeat_at, lease_expires_at.
- `agent_task_events`: task_id, event_type, actor, safe_payload_json, created_at.
- `agent_task_outputs`: task_id, output_ref, content_hash, created_at.
- Индексы: status + available_at + priority; owner_user_id + created_at; unique(owner_user_id, idempotency_key) для заданий с ключом идемпотентности.

Имена и типы полей уточнить по текущим DB conventions перед миграцией; это проектная схема, не существующая реализация.

### 4.2 Состояния

`queued → claimed → running → (waiting_approval → running) → succeeded`

Альтернативные переходы: `running → retry_wait → queued`, `running → failed`, `retry_wait → dead_letter`, `queued/claimed/running → cancelled`.

- `claimed` и `running` должны иметь lease с ограниченным сроком действия.
- Worker продлевает lease heartbeat-ом; истёкший lease может быть безопасно перехвачен другим worker.
- Каждый переход записывается в event log.
- Повторная постановка с тем же idempotency key не создаёт дубликат.
- Backoff: экспоненциальный с jitter и верхним пределом; ошибки классифицируются на retryable/non-retryable.
- После исчерпания попыток задача попадает в dead-letter с причиной и возможностью ручного requeue.
- Cancellation — кооперативная; внешняя операция, уже отправленная провайдеру, не считается отменённой только потому, что отменён локальный worker.
- Для нескольких процессов использовать атомарный claim/lease на уровне БД, а не Python mutex как единственную блокировку.
- Не заявлять exactly-once для внешних API. Гарантия очереди — durable at-least-once delivery плюс idempotency/дедупликация там, где это возможно.

### 4.3 Безопасное выполнение

Перед исполнением каждой задачи проверять владельца, workspace, роль, grants на конкретный tool и политику риска. Approval должен быть привязан к точному действию, tool, нормализованным аргументам, исполнителю и сроку действия. Изменение аргументов аннулирует approval. Одобрение одной операции не разрешает последующие похожие операции.

Секреты не передавать в prompt и не включать в audit payload. Сохранять только redacted summaries, hashes и references. Входящие документы, страницы, MCP results и tool outputs — недоверенные данные, не инструкции системы.

## 5. Безопасность: заимствуемые принципы OpenBot

Кандидат для исследования: `CopilotKit/OpenBot` (MIT). Полезны его разделение agent/runtime и tool governance, явные approval flows, audit events, boundaries для browser/files/MCP и минимальные права. Интегрировать отдельные patterns и контракты, не импортировать OpenBot UI/backend целиком.

Обязательные правила Светланы:

1. Deny-by-default для неизвестных инструментов и ресурсов.
2. RBAC + resource ownership checks на каждом backend endpoint и tool call.
3. Разделять read, write, execute, network и destructive capabilities.
4. Approval обязателен для отправки сообщений/платежей/публикаций/удалений, изменения аккаунтов, внешних shell-команд и записи вне workspace.
5. Сначала denylist/политика запрета, затем allowlist/grants; режим auto не обходит deny.
6. Ограничить сетевые адреса, redirect, loopback/private IP и доступ к локальным файлам.
7. Изолировать выполнение команд/браузера; никакого неявного fallback из sandbox на host.
8. Аудировать разрешённые, отклонённые, завершившиеся ошибкой и подтверждённые действия.
9. Хранить credentials в secret store/OS keyring или защищённом backend secret storage; не в git и не в prompt.
10. Prompt injection из файлов, сайтов, MCP и писем не может менять system policy или выдавать новые права.

Текущий Octop default `hitl.enabled=false` и `tool_guard.mode=warn` нужно изменить отдельным безопасным профилем Светланы после проверки всех поддерживаемых инструментов и тестов. Не переключать глобально на строгий режим до проверки совместимости, чтобы не сломать легитимные read-only сценарии.

## 6. Orkas: перенос 16 специалистов

Orkas публикует 16 встроенных специалистов и Commander под MIT. Переносить их как роли/skill packages в формат Octop, а не копировать desktop application. Для каждого профиля обязательна карточка:

- source path и upstream commit;
- имя, назначение, inputs/outputs и критерии завершения;
- системные инструкции и поддерживаемые языки;
- используемые tools/MCP и требуемые grants;
- зависимости и локальные скрипты;
- ограничения риска и approval requirements;
- license notices и перечень сторонних assets;
- адаптация под Octop API и проверка результата.

Команда Orkas включает роли исследования, SEO, финансового анализа, контента, презентаций, изображений, видео, аудио, UI, разработки, офисных документов и пяти e-commerce ролей. Точный manifest профилей фиксировать из исходных файлов Orkas; README-список — только ориентир, не доказательство переноса. Commander адаптировать как планировщик/делегатор Octop, сохраняя единую очередь задач и единый approval gate.

## 7. ApmixBot

Публичная страница ApmixBot описывает Android-команду агентов, Chief, группы, memory, шаблоны ботов и MCP-коннекторы. На момент исследования публичный GitHub source repository и лицензия исходников не подтверждены. Поэтому копирование кода/профилей из ApmixBot — **BLOCKED**. Допустимо изучать общедоступные UX/workflow идеи; для переноса реализации нужен точный репозиторий/PR и проверка лицензии. Существующие изменения/PR #166 не изменять.

## 8. Локализация и бренд

Поддерживаемые UI locales: `ru`, `vi`, `en`, `zh`; русский — default и fallback. Вьетнамский выбирается по браузерному locale vi; английский и упрощённый китайский сохраняются. Полное покрытие должно включать dashboard, backend messages, validation, notifications, errors, onboarding, expert/skill labels, desktop/browser UI и документацию. Ответы Commander и специалистов должны следовать языку пользователя. Переводческие словари ru/vi сейчас частичные — полнота не подтверждена.

Пользовательский бренд: «Светлана 2.0». Не показывать Octop как название продукта в пользовательских заголовках/навигации. Сохранить upstream attribution и лицензионные уведомления в документации/о программе.

## 9. Порядок реализации и критерии приёмки

1. Инвентаризация Octop queue/task/cron/DB abstractions и выбор безопасного DB migration pattern.
2. Спецификация и миграции persistent queue.
3. Repository + service + worker claim/lease/recovery.
4. Retry/backoff, cancellation, dead-letter, idempotency.
5. Approval gate + audit integration для queued jobs.
6. Пилотный перенос Commander и нескольких низкорисковых Orkas specialists; затем остальные роли по manifest.
7. Проверенные OpenBot security patterns и строгие тесты policy.
8. Выборочно совместимые ApmixBot функции только после разрешения лицензии.
9. Полное покрытие RU/VI/EN/ZH и branding pass.
10. Полная интеграционная проверка после переноса основных компонентов.

На каждом этапе отделять: code present, static checks, CI/build, API runtime, device/browser runtime и реальное действие. Не ставить PASS на основании наличия файлов.

## 10. Журнал статуса

| Область | Статус | Основание / следующий шаг |
|---|---|---|
| Fork lineage Octop → Svetlana-ai | VERIFIED | GitHub API parent/source |
| Пилотная ветка | VERIFIED | `svetlana-pilot`, +14 ahead / 0 behind на момент проверки |
| Четыре locale identifiers | VERIFIED | RU/VI/EN/ZH файлы и код уже есть |
| Полнота переводов RU/VI | NOT VERIFIED | Нужен key parity audit и перевод всех пользовательских строк |
| Octop agents/skills/MCP/DB/audit | VERIFIED (code presence) | Наличие файлов не подтверждает runtime |
| Durable general-purpose task queue | NOT VERIFIED | TeamJobTracker in-process; требуется реализация |
| Cron persistence/leases | VERIFIED (code presence) | Cron repository/status/lease/audit уже существуют |
| HITL secure defaults | NOT VERIFIED | Default policy currently disables HITL |
| Orkas license | VERIFIED | Repository metadata MIT |
| Orkas 16 specialist profiles | NOT VERIFIED | Нужен manifest из upstream tree и перенос/адаптация |
| CopilotKit/OpenBot license | VERIFIED | Repository metadata MIT |
| OpenBot integration | NOT VERIFIED | Patterns identified; code not ported |
| ApmixBot source/license | BLOCKED | Public source repository and license not established |
| Full integration/runtime | NOT RUN | Намеренно отложено до переноса основных компонентов |

## 11. Источники исследования

- Octop upstream: https://github.com/TencentCloud/Octop
- Orkas source (MIT): https://github.com/Orkas-AI/Orkas
- Orkas official agents: https://orkas.ai/agents/
- CopilotKit OpenBot (MIT): https://github.com/CopilotKit/OpenBot
- ApmixBot product overview: https://bot.apmix.ai/ru
- Current fork: https://github.com/paulafanasyev/Svetlana-ai
