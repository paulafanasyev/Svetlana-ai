# Светлана 2.0 — UI, аватар и голосовой слой

**Репозиторий:** `paulafanasyev/Svetlana-ai`  
**База:** `TencentCloud/Octop`  
**Рабочая ветка:** `feat/svetlana-2-ui-avatar-voice`  
**PR:** #1 (draft, target: `svetlana-pilot`)  
**Назначение:** пользовательская оболочка Светланы 2.0 поверх Octop runtime. Этот документ фиксирует именно реализованное состояние и оставшиеся этапы.

## Продуктовая цель

Octop остаётся внутренним движком: agents, tools, MCP, memory, sessions, cron, workspaces и backend. Пользователь видит продукт «Светлана 2.0»: единый фирменный интерфейс, исходный аватар, голосовой ввод/вывод и RU/VI как основные локали. EN/ZH сохраняются.

## Реализовано в feature-ветке

- Исходный файл аватара скопирован из приватного `paulafanasyev/Svetlana-2.0`:
  `dashboard/public/images/avatar/svetlana-master.jpg`.
- Добавлены SVG-идентификаторы:
  `dashboard/public/svetlana-wordmark.svg`, `dashboard/public/svetlana-mark.svg`.
- Обновлены брендинг sidebar/mobile header, HTML title/lang/favicon и PWA manifest.
- Добавлен `SvetlanaCompanion`: аватар и статус TTS вне экрана чата; на странице чата компонент скрывается, чтобы не перекрывать composer.
- В сообщениях главного assistant без собственной иконки используется master avatar; для активного озвучиваемого сообщения добавляется зелёное свечение.
- Default UI locale — RU; RU/VI/EN/ZH остаются поддерживаемыми.
- Ant Design и dayjs переключаются на RU/VI/EN/ZH локали.
- Browser STT realtime получает корректные locale-коды `ru` и `vi`.
- Browser TTS получает выбранную локаль UI; выбор локального голоса предпочитает женские RU/VI голоса, если они доступны на устройстве.
- Server Edge TTS получает locale-specific `voice_id`: `ru-RU-SvetlanaNeural`, `vi-VN-HoaiMyNeural`, а также EN/ZH fallback IDs. Эти ID соответствуют опубликованному каталогу Microsoft Speech.
- Переведены общие элементы, навигация, настройки голоса, sign-in, onboarding/invite, PWA, upload/errors и основные chat controls на RU/VI.
- Добавлен dashboard CI workflow: lint, unit tests и production build; production build теперь запускается даже при падении unit tests, чтобы результат сборки был виден отдельно.
- Исправлено форматирование backend locale helpers, выявленное Ruff.

## Ограничения — не считать завершённым

- По текущему подсчёту leaf-ключей EN содержит 7422 строки; RU — 962 строки, из них совпадают с EN 960 (12.93% покрытия); VI — 962 строки, из них совпадают с EN 960 (12.93%). В RU/VI переведены оболочка и навигация, чат-приветствие и быстрые команды, инструменты и подсказки упоминаний, настройки пользователя и учётной записи, пароль/SSO/MFA/ключи доступа/коды восстановления, политики безопасности агентов, персонализация экспертов и заголовки основных страниц. Разделы models, memory, connectors, channels, workspace и advanced settings пока в основном используют EN fallback. Полная RU/VI локализация НЕ VERIFIED.
- ZH словарь сохраняет полное покрытие EN; EN исходник не менялся.
- Microsoft Neural voice — штатный синтезированный голос провайдера, не клонированная запись/персональная voice model Светланы.
- Реальное воспроизведение TTS на Android/устройстве, STT на конкретном микрофоне и UI runtime ещё не подтверждены.
- Не проверено, что у всех исходных assistant agents задано имя «Светлана»; master avatar подставляется для default assistant без собственной иконки и для имени Светлана.
- Полный визуальный перенос компонентов/страниц из private Svetlana 2.0 в Octop ещё не завершён. Текущий срез — бренд, companion, avatar, palette и языковой/голосовой слой.
- CRM, Orkas specialists, OpenBot security approvals и durable task queue — отдельные следующие этапы; не объявлять интегрированными в этом PR.

## Проверки

- GitHub PR workflow: общая CI и отдельный dashboard CI (lint → Vitest → TypeScript/Vite build).
- Результаты каждого workflow фиксировать по конкретному head SHA. Предыдущий lint failure был связан с форматированием двух locale helper файлов; они отформатированы, но PASS подтверждать только после успешного свежего CI.
- Не считать PR draft или mergeable статусом доказательством runtime готовности.

## Следующие этапы

1. Довести RU/VI локализацию основных пользовательских экранов и backend messages; добавить автоматическую key-parity отчётность.
2. Перенести визуальную систему Светланы 2.0 на основные Octop routes (chat, settings, workspace, experts, admin) без потери функциональности.
3. Проверить server Edge TTS и browser fallback на RU/VI; провести runtime тест микрофона/озвучивания и статусы avatar.
4. Перенести CRM/business workflows Светланы после проверки точных модулей и API.
5. Перенести 16 Orkas specialists + Commander в Octop expert/skill format.
6. Внедрить OpenBot-style action-bound approvals, tool grants и audit.
7. Реализовать durable task queue после завершения аудита DB/migrations/workers.

## Безопасность изменений

Не менять `main`, стабильные релизы и PR #166. Не мержить этот PR автоматически и не выпускать production build до успешных CI и runtime проверок.
