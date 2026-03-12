<div align="center">
  <img src="public/logo.svg" alt="Claude Code UI" width="64" height="64">
  <h1>Claude Code UI — Summer Edition ☀️</h1>
  <p><a href="https://github.com/siteboon/claudecodeui">CloudCLI / Claude Code UI</a>의 커뮤니티 포크, <b>Claude Code</b> 경험 향상에 집중합니다.<br>실시간 스트리밍 렌더링, 사고 과정 시각화, 도구 진행률 표시, 비용 추적 — VS Code 수준의 렌더링을 웹 UI로 구현합니다.</p>
</div>

> **참고**: 이것은 수정된("魔改") 버전(Summer Edition)입니다. 원본 프로젝트는 [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui)를 방문하세요.

<div align="right"><i><a href="./README.md">English</a> · <a href="./README.ru.md">Русский</a> · <b>한국어</b> · <a href="./README.zh-CN.md">中文</a> · <a href="./README.ja.md">日本語</a></i></div>

---

## Summer Edition의 변경 사항

이 포크는 **Claude Code** 통합 경험 개선에 집중합니다. 업스트림 프로젝트는 Claude Code, Cursor CLI, Codex, Gemini CLI를 지원하며 — 멀티 프로바이더 지원은 유지하면서 Claude Code 경험을 최고 수준으로 만드는 데 주력합니다.

### 핵심 개선 사항

| 기능 | 설명 |
|---|---|
| **실시간 스트림 렌더링** | SDK 메시지(`stream_event`, `assistant`, `tool_progress` 등)가 도착하는 즉시 렌더링, 버퍼링 없음 |
| **사고 블록 시각화** | `<Thinking>` 블록이 실시간으로 스트리밍되며 사고 시간 추적(`thinkingDurationMs`) |
| **도구 진행률 표시** | 실행 중인 도구의 실시간 진행 바 및 상태 텍스트 |
| **서브에이전트 컨테이너** | 중첩된 에이전트 작업이 taskId 매칭으로 렌더링되며 진행 로그 표시 |
| **속도 제한 배너** | API 속도 제한 시 카운트다운 배너 표시 |
| **비용 정보 바** | 응답별 비용, 소요 시간 및 모델 정보 표시 |
| **에이전트 상태 피드** | SDK 상태 메시지(`파일 읽는 중...`, `코드베이스 검색 중...`)가 ClaudeStatus를 통해 실시간 표시 |
| **스트림 지연 감소** | 플러시 간격을 100ms에서 33ms로 줄여 더 부드러운 스트리밍 |
| **보안 강화** | gray-matter 프론트매터 엔진을 비활성화하여 코드 실행 방지 |

### 아키텍처 변경

- **백엔드**: SDK 메시지가 `classifySDKMessage()`로 분류되어 `subType` 태그를 받은 후 WebSocket으로 전달
- **프론트엔드**: 모놀리식 `useChatRealtimeHandlers`가 라우팅 엔트리 + 9개 모듈러 핸들러 파일로 리팩토링
- **타입**: `ChatMessage`에 `isThinking`, `thinkingDurationMs`, `toolName`, `toolInput`, `progressPercentage`, `subagentId` 등 확장
- **i18n**: 모든 새 UI 문자열이 5개 언어(en, zh-CN, ko, ja, ru)에 추가

---

## 스크린샷

<div align="center">

<table>
<tr>
<td align="center">
<h3>데스크톱 뷰</h3>
<img src="public/screenshots/desktop-main.png" alt="Desktop Interface" width="400">
<br>
<em>프로젝트 개요와 채팅을 보여주는 메인 인터페이스</em>
</td>
<td align="center">
<h3>모바일 경험</h3>
<img src="public/screenshots/mobile-chat.png" alt="Mobile Interface" width="250">
<br>
<em>터치 내비게이션이 포함된 반응형 모바일 디자인</em>
</td>
</tr>
<tr>
<td align="center" colspan="2">
<h3>CLI 선택</h3>
<img src="public/screenshots/cli-selection.png" alt="CLI Selection" width="400">
<br>
<em>Claude Code, Cursor CLI, Codex 중 선택</em>
</td>
</tr>
</table>



</div>

## 기능

기존 업스트림 기능 모두 유지:

- **반응형 디자인** - 데스크톱, 태블릿, 모바일에서 원활하게 작동
- **대화형 채팅 인터페이스** - AI 에이전트와 원활하게 소통하는 내장 채팅 인터페이스
- **통합 셸 터미널** - 내장 셸 기능을 통한 CLI 직접 접근
- **파일 탐색기** - 구문 강조 및 실시간 편집이 가능한 대화형 파일 트리
- **Git 탐색기** - 변경사항 보기, 스테이징 및 커밋
- **세션 관리** - 대화 재개, 여러 세션 관리 및 기록 추적
- **TaskMaster AI 통합** *(선택사항)* - AI 기반 작업 계획 및 워크플로우 자동화

**Summer Edition 추가 기능:**

- **🔥 실시간 메시지 스트리밍** - SDK 메시지가 도착하는 즉시 렌더링 (33ms 플러시 간격)
- **💭 사고 블록 스트리밍** - Claude의 사고 과정을 실시간으로 관찰, 시간 추적 포함
- **🔧 도구 진행률 표시** - 실행 중인 도구의 실시간 진행 바
- **🤖 서브에이전트 컨테이너** - 진행 로그가 포함된 중첩 에이전트 작업
- **⏱️ 비용 및 소요 시간 추적** - 응답별 비용, 모델 및 시간 정보
- **🚦 속도 제한 처리** - 제한 발생 시 시각적 카운트다운 배너
- **📡 에이전트 상태 피드** - SDK 실시간 상태 텍스트 (읽는 중, 검색 중 등)


## 빠른 시작

### 개발 환경 (이 포크에서)

```bash
git clone https://github.com/FuHesummer/claudecodeui-summer.git
cd claudecodeui-summer
npm install
cp .env.example .env
npm run dev
```

`http://localhost:3001`을 열면 — 기존 Claude Code 세션이 자동으로 검색됩니다.

### 업스트림 동기화

```bash
git remote add upstream https://github.com/siteboon/claudecodeui.git
git fetch upstream
# 특정 커밋 체리픽 (관련 없는 히스토리로 인해 merge는 충돌 발생)
git cherry-pick <commit-hash>
```

### PM2 백그라운드 실행 (프로덕션)

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 startup && pm2 save  # 부팅 시 자동 시작
```

> 이 포크에는 `WORKSPACES_ROOT` 환경 변수가 설정된 `ecosystem.config.cjs`가 포함되어 있습니다.

## 보안 및 도구 설정

**🔒 중요 공지**: 모든 Claude Code 도구는 **기본적으로 비활성화**되어 있습니다. 이는 잠재적으로 유해한 작업이 자동으로 실행되는 것을 방지합니다.

### 도구 활성화

Claude Code의 전체 기능을 사용하려면 수동으로 도구를 활성화해야 합니다:

1. **도구 설정 열기** - 사이드바의 톱니바퀴 아이콘을 클릭
2. **선택적으로 활성화** - 필요한 도구만 활성화
3. **설정 적용** - 환경설정은 로컬에 저장됩니다

<div align="center">

![도구 설정 모달](public/screenshots/tools-modal.png)
*도구 설정 인터페이스 - 필요한 것만 활성화하세요*

</div>

**권장 접근법**: 기본 도구부터 활성화하고 필요에 따라 추가하세요. 언제든지 이 설정을 조정할 수 있습니다.

## 라이선스

GNU General Public License v3.0 - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

이 프로젝트는 오픈 소스이며 GPL v3 라이선스에 따라 자유롭게 사용, 수정 및 배포할 수 있습니다.

## 감사의 말

### 업스트림 프로젝트
- **[CloudCLI / Claude Code UI](https://github.com/siteboon/claudecodeui)** - Siteboon이 개발한 원본 프로젝트, 이 포크의 기반

### 사용 기술
- **[Claude Code](https://docs.anthropic.com/en/docs/claude-code)** - Anthropic의 공식 CLI
- **[Cursor CLI](https://docs.cursor.com/en/cli/overview)** - Cursor의 공식 CLI
- **[Codex](https://developers.openai.com/codex)** - OpenAI Codex
- **[React](https://react.dev/)** - 사용자 인터페이스 라이브러리
- **[Vite](https://vitejs.dev/)** - 빠른 빌드 도구 및 개발 서버
- **[Tailwind CSS](https://tailwindcss.com/)** - 유틸리티 우선 CSS 프레임워크
- **[CodeMirror](https://codemirror.net/)** - 고급 코드 편집기
- **[TaskMaster AI](https://github.com/eyaltoledano/claude-task-master)** *(선택사항)* - AI 기반 프로젝트 관리 및 작업 계획

## 커뮤니티 및 지원

- **업스트림 프로젝트**: [siteboon/claudecodeui](https://github.com/siteboon/claudecodeui) — 원본 프로젝트
- **이 포크**: [FuHesummer/claudecodeui-summer](https://github.com/FuHesummer/claudecodeui-summer) — Summer Edition
- **업스트림 문서**: [cloudcli.ai/docs](https://cloudcli.ai/docs) — 설치, 설정, 기능

---

<div align="center">
  <strong>Summer Edition ☀️ — Claude Code UI를 더 좋게, 한 번의 스트리밍으로.</strong>
  <br><br>
  <sub><a href="https://github.com/siteboon/claudecodeui">CloudCLI</a> by <a href="https://siteboon.ai">Siteboon</a> 기반</sub>
</div>
