<div align="center">
  <img src="public/logo.svg" alt="Claude Code UI" width="64" height="64">
  <h1>Claude Code UI — Summer Edition ☀️</h1>
  <p>Комьюнити-форк <a href="https://github.com/siteboon/claudecodeui">CloudCLI / Claude Code UI</a>, сфокусированный на улучшении опыта работы с <b>Claude Code</b>.<br>Потоковый рендеринг в реальном времени, визуализация мыслительного процесса, прогресс инструментов, отслеживание стоимости — рендеринг уровня VS Code в веб-интерфейсе.</p>
</div>

> **Примечание**: Это модифицированная версия (Summer Edition). Оригинальный проект: [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui).

<div align="right"><i><a href="./README.md">English</a> · <b>Русский</b> · <a href="./README.ko.md">한국어</a> · <a href="./README.zh-CN.md">中文</a> · <a href="./README.ja.md">日本語</a></i></div>

---

## Что изменилось в Summer Edition

Этот форк сосредоточен на улучшении интеграции с **Claude Code**. Upstream-проект поддерживает Claude Code, Cursor CLI, Codex и Gemini CLI — мы сохраняем мультипровайдерную поддержку, но вкладываем усилия в то, чтобы сделать опыт работы с Claude Code лучшим в своём классе.

### Ключевые улучшения

| Функция | Описание |
|---|---|
| **Потоковый рендеринг в реальном времени** | SDK-сообщения (`stream_event`, `assistant`, `tool_progress` и др.) рендерятся сразу при поступлении, без буферизации |
| **Визуализация блоков мышления** | Блоки `<Thinking>` транслируются в реальном времени с отслеживанием длительности (`thinkingDurationMs`) |
| **Отображение прогресса инструментов** | Живые полосы прогресса и текст статуса для работающих инструментов |
| **Контейнеры субагентов** | Вложенные задачи агентов рендерятся с привязкой к taskId и логами прогресса |
| **Баннер ограничения скорости** | Баннер с обратным отсчётом при срабатывании ограничений API |
| **Панель стоимости** | Стоимость, длительность и модель для каждого ответа в области ввода |
| **Лента статуса агента** | Статусные сообщения SDK (`Чтение файла...`, `Поиск по коду...`) отображаются в реальном времени через ClaudeStatus |
| **Уменьшение задержки потока** | Интервал сброса уменьшен со 100мс до 33мс для более плавной трансляции |
| **Усиление безопасности** | Движок frontmatter gray-matter отключён для JS/JSON для предотвращения выполнения кода |

### Архитектурные изменения

- **Бэкенд**: SDK-сообщения классифицируются через `classifySDKMessage()` → тег `subType` перед пересылкой через WebSocket
- **Фронтенд**: Монолитный `useChatRealtimeHandlers` рефакторирован в маршрутизатор + 9 модульных файлов-обработчиков
- **Типы**: `ChatMessage` расширен полями `isThinking`, `thinkingDurationMs`, `toolName`, `toolInput`, `progressPercentage`, `subagentId` и др.
- **i18n**: Все новые UI-строки добавлены на 5 языков (en, zh-CN, ko, ja, ru)

---

## Скриншоты

<div align="center">

<table>
<tr>
<td align="center">
<h3>Версия для десктопа</h3>
<img src="public/screenshots/desktop-main.png" alt="Desktop Interface" width="400">
<br>
<em>Основной интерфейс с обзором проекта и чатом</em>
</td>
<td align="center">
<h3>Мобильный режим</h3>
<img src="public/screenshots/mobile-chat.png" alt="Mobile Interface" width="250">
<br>
<em>Адаптивный мобильный интерфейс с сенсорной навигацией</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>Выбор CLI</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI Selection" width="400">
<br>
<em>Выбор между Claude Code, Cursor CLI и Codex</em>
</td>
</tr>
</table>



</div>

## Возможности

Все upstream-возможности сохранены:

- **Адаптивный дизайн** - одинаково хорошо работает на десктопе, планшете и телефоне
- **Интерактивный чат-интерфейс** - встроенный чат для взаимодействия с AI-агентами
- **Встроенный shell-терминал** - прямой доступ к CLI через встроенную оболочку
- **Файловый менеджер** - интерактивное дерево файлов с подсветкой синтаксиса и live-редактированием
- **Git Explorer** - просмотр, stage и commit изменений
- **Управление сессиями** - возобновление диалогов, работа с несколькими сессиями и история
- **Интеграция с TaskMaster AI** *(опционально)* - AI-планирование задач и автоматизация workflows

**Summer Edition добавляет:**

- **🔥 Потоковый рендеринг сообщений** - SDK-сообщения рендерятся при поступлении (интервал сброса 33мс)
- **💭 Трансляция блоков мышления** - наблюдайте за мыслительным процессом Claude в реальном времени с отслеживанием длительности
- **🔧 Отображение прогресса инструментов** - живые полосы прогресса для работающих инструментов
- **🤖 Контейнеры субагентов** - вложенные задачи агентов с логами прогресса
- **⏱️ Отслеживание стоимости и времени** - стоимость, модель и время для каждого ответа
- **🚦 Обработка ограничений скорости** - визуальный баннер обратного отсчёта при срабатывании лимитов
- **📡 Лента статуса агента** - текст статуса SDK в реальном времени (Чтение, Поиск и т.д.)


## Быстрый старт

### Разработка (из этого форка)

```bash
git clone https://github.com/FuHesummer/claudecodeui-summer.git
cd claudecodeui-summer
npm install
cp .env.example .env
npm run dev
```

Откройте `http://localhost:3001` — все существующие сессии Claude Code будут обнаружены автоматически.

### Синхронизация с upstream

```bash
git remote add upstream https://github.com/siteboon/claudecodeui.git
git fetch upstream
# Cherry-pick конкретных коммитов (merge вызовет конфликты из-за несвязанных историй)
git cherry-pick <commit-hash>
```

### Фоновый запуск через PM2 (продакшен)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 startup && pm2 save  # автозапуск при загрузке системы
```

> Этот форк включает `ecosystem.config.cjs` с настроенной переменной окружения `WORKSPACES_ROOT`.

## Безопасность и настройка инструментов

**🔒 Важно**: все инструменты Claude Code **по умолчанию отключены**. Это предотвращает автоматический запуск потенциально опасных операций.

### Включение инструментов

Чтобы использовать всю функциональность Claude Code, инструменты нужно включить вручную:

1. **Откройте настройки инструментов** - нажмите на иконку шестерёнки в боковой панели
2. **Включайте выборочно** - активируйте только необходимые инструменты
3. **Примените настройки** - предпочтения сохраняются локально

<div align="center">

![Tools Settings Modal](public/screenshots/tools-modal.png)
*Окно настройки инструментов - включайте только то, что вам нужно*

</div>

**Рекомендуемый подход**: начните с базовых инструментов и добавляйте остальные по мере необходимости. Эти настройки всегда можно поменять позже.

## Лицензия

GNU General Public License v3.0 - подробности в файле [LICENSE](LICENSE).

Этот проект открыт и может свободно использоваться, изменяться и распространяться по лицензии GPL v3.

## Благодарности

### Upstream-проект
- **[CloudCLI / Claude Code UI](https://github.com/siteboon/claudecodeui)** - Оригинальный проект от Siteboon, на котором основан этот форк

### Используется
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - официальный CLI от Anthropic
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - официальный CLI от Cursor
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[React](https://react.dev/)** - библиотека пользовательских интерфейсов
- **[Vite](https://vitejs.dev/)** - быстрый инструмент сборки и dev-сервер
- **[Tailwind CSS](https://tailwindcss.com/)** - utility-first CSS framework
- **[CodeMirror](https://codemirror.net/)** - продвинутый редактор кода
- **[TaskMaster AI](https://github.com/eyaltoledano/claude-task-master)** *(опционально)* - AI-управление проектами и планирование задач

## Сообщество и поддержка

- **Upstream-проект**: [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) — оригинальный проект
- **Этот форк**: [FuHesummer/claudecodeui-summer](https://github.com/FuHesummer/claudecodeui-summer) — Summer Edition
- **Upstream-документация**: [cloudcli.ai/docs](https://cloudcli.ai/docs) — установка, настройка, возможности

---

<div align="center">
  <strong>Summer Edition ☀️ — Делаем Claude Code UI лучше, один стрим за раз.</strong>
  <br><br>
  <sub>На основе <a href="https://github.com/siteboon/claudecodeui">CloudCLI</a> от <a href="https://siteboon.ai">Siteboon</a></sub>
</div>
