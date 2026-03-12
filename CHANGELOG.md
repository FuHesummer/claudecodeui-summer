# Changelog

All notable changes to Claude Code UI Summer Edition will be documented in this file.


## 1.26.0 (2026-03-12)

### New Features

* **chat:** add handleStreamEvent handler for real-time stream processing ([daabb32](https://github.com/FuHesummer/claudecodeui-summer/commit/daabb32bf513dfd755c37aecc7b4115f0acfbdeb))
* **chat:** wire RateLimitBanner, thinkingDuration, agentStatus into UI ([50cd748](https://github.com/FuHesummer/claudecodeui-summer/commit/50cd7483d4ad523e1d93a475729e174bd9775210))
* **handlers:** add handleResult with cost info and handleLegacyMessage fallback ([e754bff](https://github.com/FuHesummer/claudecodeui-summer/commit/e754bff82e67cf48d75f5bf041f1480630bb00d7))
* **handlers:** add handleToolProgress, handleTaskLifecycle, handleStatusMessage, handleRateLimit ([fcc8e96](https://github.com/FuHesummer/claudecodeui-summer/commit/fcc8e9653294fd1de8763a0ec7b3e4bd0c5e36c8))
* **handlers:** extract handleAssistantMessage from monolith ([b8a80a2](https://github.com/FuHesummer/claudecodeui-summer/commit/b8a80a2dc983600ab90716f4ba4e958244c69cfd))
* **handlers:** extract handleToolResult from monolith ([316de13](https://github.com/FuHesummer/claudecodeui-summer/commit/316de135fe784a16eaffc8fb8f78d946aa7904a0))
* **i18n:** add realtime message rendering i18n keys for all 5 languages ([625bee2](https://github.com/FuHesummer/claudecodeui-summer/commit/625bee226442d1eb09879cfb68ed9105d7f6f1fa))
* initialize from upstream siteboon/claudecodeui ([3bd6ad8](https://github.com/FuHesummer/claudecodeui-summer/commit/3bd6ad8aeaa0e11e45ba4a3784221713abfad2dd))
* **sdk:** add classifySDKMessage() and subType tag to claude-response messages ([51eb3ea](https://github.com/FuHesummer/claudecodeui-summer/commit/51eb3eabb967b339e3c761430b50f52a9ba232d5))
* **types:** add ChatMessage fields and CostInfo/RateLimitState/AgentStatusState types ([fb77285](https://github.com/FuHesummer/claudecodeui-summer/commit/fb772850d94a854737760380eb0e3201a3fcbb88))
* **ui:** add taskId matching and progressLog to SubagentContainer ([6a3aa02](https://github.com/FuHesummer/claudecodeui-summer/commit/6a3aa02d299129e876d6cb7339c014964513a1fd))
* **ui:** add ThinkingStreamBlock component with streaming support ([81f434d](https://github.com/FuHesummer/claudecodeui-summer/commit/81f434d0677f537d207c011ae95595af63d085f1))
* **ui:** add ToolProgressDisplay, RateLimitBanner, and CostInfoBar ([b7e77e8](https://github.com/FuHesummer/claudecodeui-summer/commit/b7e77e86e462734f2f984046b879796eddb6bf8f))
* **ui:** integrate ThinkingStreamBlock and ToolProgressDisplay ([814dd98](https://github.com/FuHesummer/claudecodeui-summer/commit/814dd98b8bd7c2681bad1144fceff35f60bed5dc))
* **ui:** wire CostInfoBar into ChatInputControls via ChatComposer ([3a31647](https://github.com/FuHesummer/claudecodeui-summer/commit/3a31647bec703a96a885868009806b60fd1ce294))

### Bug Fixes

* **ci:** add comprehensive npm auth diagnostics to Release step ([c90b8d9](https://github.com/FuHesummer/claudecodeui-summer/commit/c90b8d93a1380c4840fd5e9abb66b6bbce558e15))
* **ci:** add explicit npm auth step for release-it ([359f8a3](https://github.com/FuHesummer/claudecodeui-summer/commit/359f8a36dac7a75e93b9f67cf29d8e69a33f445e))
* **ci:** add GITHUB_TOKEN to checkout for git push, add error diagnostics ([d821ab2](https://github.com/FuHesummer/claudecodeui-summer/commit/d821ab2ca0e1c9c2eae8eb82437c37ae6b90981e))
* **ci:** add npm auth debug output to diagnose token issues ([b69af97](https://github.com/FuHesummer/claudecodeui-summer/commit/b69af970bcbfe78d4c3dedf8d5da84c9d742c8dd))
* **ci:** pass NPM_TOKEN env to release-it step ([c64ec15](https://github.com/FuHesummer/claudecodeui-summer/commit/c64ec1576d0d3ddfc8d53fb701df7b2925385598))
* **ci:** relax requireCleanWorkingDir, add release-it verbose mode ([6c09cce](https://github.com/FuHesummer/claudecodeui-summer/commit/6c09cced7d77a6701f7628596fd437a96be96e99))
* **ci:** remove actions/setup-node registry-url, write npmrc directly ([7088794](https://github.com/FuHesummer/claudecodeui-summer/commit/70887947418364b7fa12d1b6564bc12f5e808fb4))
* **ci:** skip release-it npm pre-checks for first publish ([6ac18ae](https://github.com/FuHesummer/claudecodeui-summer/commit/6ac18ae1e43284ef9d68067099a563e57f332890))
* **ci:** write npm auth to NPM_CONFIG_USERCONFIG path ([bd71ece](https://github.com/FuHesummer/claudecodeui-summer/commit/bd71ece1027b229166c787ae29090d17ca21527c))
* **docs:** address 10 spec review issues in realtime rendering design ([afeab5c](https://github.com/FuHesummer/claudecodeui-summer/commit/afeab5c661c619ce448751af8199ab7734ac0f4f))
* **security:** disable executable gray-matter frontmatter in commands ([c99f171](https://github.com/FuHesummer/claudecodeui-summer/commit/c99f1715392e6ef78f48e1d09913d5b21b9f272c))

### Refactoring

* **chat:** convert useChatRealtimeHandlers to subType-based routing ([ac194cc](https://github.com/FuHesummer/claudecodeui-summer/commit/ac194cc22d4689a0be626b9f39d657e603f9a919))

### Documentation

* add npm publishing pipeline spec and plan ([2bf58ec](https://github.com/FuHesummer/claudecodeui-summer/commit/2bf58ecb1dbee72fc025b0604303f3771f4e74c5))
* add PM2 deployment section to README.md ([29eb07c](https://github.com/FuHesummer/claudecodeui-summer/commit/29eb07c44d90650fdd00d51260bc0553bf5696d4))
* add real-time message rendering design spec ([85cd996](https://github.com/FuHesummer/claudecodeui-summer/commit/85cd9966e4dac7f3c66927285d1a9f04a7b06717))
* add realtime message rendering design plan ([fdf191c](https://github.com/FuHesummer/claudecodeui-summer/commit/fdf191c2db896ba73397a214aa21439b28bbf525))
* **i18n:** update ko/ja/ru READMEs for Summer Edition fork identity ([483b776](https://github.com/FuHesummer/claudecodeui-summer/commit/483b7769fbcf3ac83764aee7517dfc2b007646bc))
* update README for Summer Edition fork identity ([4558398](https://github.com/FuHesummer/claudecodeui-summer/commit/4558398f6fe1e92f424962ffc6528922e566da94))

### Maintenance

* add PM2 ecosystem config with WORKSPACES_ROOT ([df279fa](https://github.com/FuHesummer/claudecodeui-summer/commit/df279fa638c419a909a55444a76d302cdac5d604))
* change npm scope from [@fuhesummer](https://github.com/fuhesummer) to [@ccui-summer](https://github.com/ccui-summer) ([b3bee92](https://github.com/FuHesummer/claudecodeui-summer/commit/b3bee92ace06b3c3ec5a18cf07c2e10e2a92a63c))
* update package identity to @fuhesummer/claude-code-ui ([b63c64d](https://github.com/FuHesummer/claudecodeui-summer/commit/b63c64d391e5eb15a4a217da55b2be4a46fa1cb3))
* update release-it config for fork identity ([493867f](https://github.com/FuHesummer/claudecodeui-summer/commit/493867ff11b48eeeb9da9b17a397bf7ed048ddce))

### CI/CD

* add .npmrc for npm registry authentication ([703fd5d](https://github.com/FuHesummer/claudecodeui-summer/commit/703fd5d03cb41a1450566b211f410ad886ee4f58))
* add beta publish workflow for dev branch ([c9f6690](https://github.com/FuHesummer/claudecodeui-summer/commit/c9f6690b13270af2163632a8d7c8f60b10996011))
* add release publish workflow for main branch ([cc12eff](https://github.com/FuHesummer/claudecodeui-summer/commit/cc12effaf5e1e9e7141debd88698aa7b430b3315))
* retrigger release after fixing NPM_TOKEN secret name ([0bd0001](https://github.com/FuHesummer/claudecodeui-summer/commit/0bd0001c2a28674ad5b68b4b3618084c696564a7))
* retrigger release with automation npm token ([cccc47a](https://github.com/FuHesummer/claudecodeui-summer/commit/cccc47a81d01382f345ddc97ec6f757dda46a32f))
* retrigger release workflow after NPM_TOKEN secret fix ([db40e3b](https://github.com/FuHesummer/claudecodeui-summer/commit/db40e3bfe3f70e0844bc8b370a8750e1b4ff3a92))
* retrigger release workflow with org-enabled npm token ([567334f](https://github.com/FuHesummer/claudecodeui-summer/commit/567334f3e1a1e58d3be28c9b52335d62354cb190))

# Changelog

All notable changes to CloudCLI UI will be documented in this file.


## [1.25.0](https://github.com/siteboon/claudecodeui/compare/v1.24.0...v1.25.0) (2026-03-10)

### New Features

* add copy as text or markdown feature for assistant messages ([#519](https://github.com/siteboon/claudecodeui/issues/519)) ([1dc2a20](https://github.com/siteboon/claudecodeui/commit/1dc2a205dc2a3cbf960625d7669c7c63a2b6905f))
* add full Russian language support; update Readme.md files, and .gitignore update ([#514](https://github.com/siteboon/claudecodeui/issues/514)) ([c7dcba8](https://github.com/siteboon/claudecodeui/commit/c7dcba8d9117e84db8aac7d8a7bf6a3aa683e115))
* new plugin system ([#489](https://github.com/siteboon/claudecodeui/issues/489)) ([8afb46a](https://github.com/siteboon/claudecodeui/commit/8afb46af2e5514c9284030367281793fbb014e4f))

### Bug Fixes

* resolve duplicate key issue when rendering model options ([#520](https://github.com/siteboon/claudecodeui/issues/520)) ([9bceab9](https://github.com/siteboon/claudecodeui/commit/9bceab9e1a6e063b0b4f934ed2d9f854fcc9c6a4))

### Maintenance

* add plugins section in readme ([e581a0e](https://github.com/siteboon/claudecodeui/commit/e581a0e1ccd59fd7ec7306ca76a13e73d7c674c1))

## [1.24.0](https://github.com/siteboon/claudecodeui/compare/v1.23.2...v1.24.0) (2026-03-09)

### New Features

* add full-text search across conversations ([#482](https://github.com/siteboon/claudecodeui/issues/482)) ([3950c0e](https://github.com/siteboon/claudecodeui/commit/3950c0e47f41e93227af31494690818d45c8bc7a))

### Bug Fixes

* **git:** prevent shell injection in git routes ([86c33c1](https://github.com/siteboon/claudecodeui/commit/86c33c1c0cb34176725a38f46960213714fc3e04))
* replace getDatabase with better-sqlite3 db in getGithubTokenById ([#501](https://github.com/siteboon/claudecodeui/issues/501)) ([cb4fd79](https://github.com/siteboon/claudecodeui/commit/cb4fd795c938b1cc86d47f401973bfccdd68fdee))

## [1.23.2](https://github.com/siteboon/claudecodeui/compare/v1.22.1...v1.23.2) (2026-03-06)

### New Features

* add clickable overlay buttons for CLI prompts in Shell terminal ([#480](https://github.com/siteboon/claudecodeui/issues/480)) ([2444209](https://github.com/siteboon/claudecodeui/commit/2444209723701dda2b881cea2501b239e64e51c1)), closes [#427](https://github.com/siteboon/claudecodeui/issues/427)
* add terminal shortcuts panel for mobile ([#411](https://github.com/siteboon/claudecodeui/issues/411)) ([b0a3fdf](https://github.com/siteboon/claudecodeui/commit/b0a3fdf95ffdb961261194d10400267251e42f17))
* implement session rename with SQLite storage ([#413](https://github.com/siteboon/claudecodeui/issues/413)) ([198e3da](https://github.com/siteboon/claudecodeui/commit/198e3da89b353780f53a91888384da9118995e81)), closes [#72](https://github.com/siteboon/claudecodeui/issues/72) [#358](https://github.com/siteboon/claudecodeui/issues/358)

### Bug Fixes

* **chat:** finalize terminal lifecycle to prevent stuck processing/thinking UI ([#483](https://github.com/siteboon/claudecodeui/issues/483)) ([0590c5c](https://github.com/siteboon/claudecodeui/commit/0590c5c178f4791e2b039d525ecca4d220c3dcae))
* **codex-history:** prevent AGENTS.md/internal prompt leakage when reloading Codex sessions ([#488](https://github.com/siteboon/claudecodeui/issues/488)) ([64a96b2](https://github.com/siteboon/claudecodeui/commit/64a96b24f853acb802f700810b302f0f5cf00898))
* preserve pending permission requests across WebSocket reconnections ([#462](https://github.com/siteboon/claudecodeui/issues/462)) ([4ee88f0](https://github.com/siteboon/claudecodeui/commit/4ee88f0eb0c648b54b05f006c6796fb7b09b0fae))
* prevent React 18 batching from losing messages during session sync ([#461](https://github.com/siteboon/claudecodeui/issues/461)) ([688d734](https://github.com/siteboon/claudecodeui/commit/688d73477a50773e43c85addc96212aa6290aea5))
* release it script ([dcea8a3](https://github.com/siteboon/claudecodeui/commit/dcea8a329c7d68437e1e72c8c766cf33c74637e9))

### Styling

* improve UI for processing banner ([#477](https://github.com/siteboon/claudecodeui/issues/477)) ([2320e1d](https://github.com/siteboon/claudecodeui/commit/2320e1d74b59c65b5b7fc4fa8b05fd9208f4898c))

### Maintenance

* remove logging of received WebSocket messages in production ([#487](https://github.com/siteboon/claudecodeui/issues/487)) ([9193feb](https://github.com/siteboon/claudecodeui/commit/9193feb6dc83041f3c365204648a88468bdc001b))

## [1.22.0](https://github.com/siteboon/claudecodeui/compare/v1.21.0...v1.22.0) (2026-03-03)

### New Features

* add community button in the app ([84d4634](https://github.com/siteboon/claudecodeui/commit/84d4634735f9ee13ac1c20faa0e7e31f1b77cae8))
* Advanced file editor and file tree improvements ([#444](https://github.com/siteboon/claudecodeui/issues/444)) ([9768958](https://github.com/siteboon/claudecodeui/commit/97689588aa2e8240ba4373da5f42ab444c772e72))
* update document title based on selected project ([#448](https://github.com/siteboon/claudecodeui/issues/448)) ([9e22f42](https://github.com/siteboon/claudecodeui/commit/9e22f42a3d3a781f448ddac9d133292fe103bb8c))

### Bug Fixes

* **claude:** correct project encoded path ([#451](https://github.com/siteboon/claudecodeui/issues/451)) ([9c0e864](https://github.com/siteboon/claudecodeui/commit/9c0e864532dcc5ce7ee890d3b4db722872db2b54)), closes [#447](https://github.com/siteboon/claudecodeui/issues/447)
* **claude:** move model usage log to result message only ([#454](https://github.com/siteboon/claudecodeui/issues/454)) ([506d431](https://github.com/siteboon/claudecodeui/commit/506d43144b3ec3155c3e589e7e803862c4a8f83a))
* missing translation label ([855e22f](https://github.com/siteboon/claudecodeui/commit/855e22f9176a71daa51de716370af7f19d55bfb4))

### Maintenance

* add Gemini-CLI support to README ([#453](https://github.com/siteboon/claudecodeui/issues/453)) ([503c384](https://github.com/siteboon/claudecodeui/commit/503c3846850fb843781979b0c0e10a24b07e1a4b))

## [1.21.0](https://github.com/siteboon/claudecodeui/compare/v1.20.1...v1.21.0) (2026-02-27)

### New Features

* add copy icon for user messages ([#449](https://github.com/siteboon/claudecodeui/issues/449)) ([b359c51](https://github.com/siteboon/claudecodeui/commit/b359c515277b4266fde2fb9a29b5356949c07c4f))
* Google's gemini-cli integration ([#422](https://github.com/siteboon/claudecodeui/issues/422)) ([a367edd](https://github.com/siteboon/claudecodeui/commit/a367edd51578608b3281373cb4a95169dbf17f89))
* persist active tab across reloads via localStorage ([#414](https://github.com/siteboon/claudecodeui/issues/414)) ([e3b6892](https://github.com/siteboon/claudecodeui/commit/e3b689214f11d549ffe1b3a347476d58f25c5aca)), closes [#387](https://github.com/siteboon/claudecodeui/issues/387)

### Bug Fixes

* add support for Codex in the shell ([#424](https://github.com/siteboon/claudecodeui/issues/424)) ([23801e9](https://github.com/siteboon/claudecodeui/commit/23801e9cc15d2b8d1bfc6e39aee2fae93226d1ad))

### Maintenance

* upgrade @anthropic-ai/claude-agent-sdk to version 0.2.59 and add model usage logging ([#446](https://github.com/siteboon/claudecodeui/issues/446)) ([917c353](https://github.com/siteboon/claudecodeui/commit/917c353115653ee288bf97be01f62fad24123cbc))
* upgrade better-sqlite to latest version to support node 25 ([#445](https://github.com/siteboon/claudecodeui/issues/445)) ([4ab94fc](https://github.com/siteboon/claudecodeui/commit/4ab94fce4257e1e20370fa83fa4c0f6fadbb8a2b))

## [1.20.1](https://github.com/siteboon/claudecodeui/compare/v1.19.1...v1.20.1) (2026-02-23)

### New Features

* implement install mode detection and update commands in version upgrade process ([f986004](https://github.com/siteboon/claudecodeui/commit/f986004319207b068431f9f6adf338a8ce8decfc))
* migrate legacy database to new location and improve last login update handling ([50e097d](https://github.com/siteboon/claudecodeui/commit/50e097d4ac498aa9f1803ef3564843721833dc19))

## [1.19.1](https://github.com/siteboon/claudecodeui/compare/v1.19.0...v1.19.1) (2026-02-23)

### Bug Fixes

* add prepublishOnly script to build before publishing ([82efac4](https://github.com/siteboon/claudecodeui/commit/82efac4704cab11ed8d1a05fe84f41312140b223))

## [1.19.0](https://github.com/siteboon/claudecodeui/compare/v1.18.2...v1.19.0) (2026-02-23)

### New Features

* add HOST environment variable for configurable bind address ([#360](https://github.com/siteboon/claudecodeui/issues/360)) ([cccd915](https://github.com/siteboon/claudecodeui/commit/cccd915c336192216b6e6f68e2b5f3ece0ccf966))
* subagent tool grouping ([#398](https://github.com/siteboon/claudecodeui/issues/398)) ([0207a1f](https://github.com/siteboon/claudecodeui/commit/0207a1f3a3c87f1c6c1aee8213be999b23289386))

### Bug Fixes

* **macos:** fix node-pty posix_spawnp error with postinstall script ([#347](https://github.com/siteboon/claudecodeui/issues/347)) ([38a593c](https://github.com/siteboon/claudecodeui/commit/38a593c97fdb2bb7f051e09e8e99c16035448655)), closes [#284](https://github.com/siteboon/claudecodeui/issues/284)
* slash commands with arguments bypass command execution ([#392](https://github.com/siteboon/claudecodeui/issues/392)) ([597e9c5](https://github.com/siteboon/claudecodeui/commit/597e9c54b76e7c6cd1947299c668c78d24019cab))

### Refactoring

* **releases:** Create a contributing guide and proper release notes using a release-it plugin ([fc369d0](https://github.com/siteboon/claudecodeui/commit/fc369d047e13cba9443fe36c0b6bb2ce3beaf61c))

### Maintenance

* update @anthropic-ai/claude-agent-sdk to version 0.1.77 in package-lock.json ([#410](https://github.com/siteboon/claudecodeui/issues/410)) ([7ccbc8d](https://github.com/siteboon/claudecodeui/commit/7ccbc8d92d440e18c157b656c9ea2635044a64f6))
