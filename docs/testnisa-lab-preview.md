# testNisa 演练区（漫漫计划部署副本）

## 用途
通过漫漫计划现有 GitHub Pages 环境，集中演练 testNisa 的独立技术实验页面。本目录是副本，不是 testNisa 正式源码，也不会自动同步。

## 来源
- 源仓库：`ouyangxinwei/testNisa`（私有仓库）
- 来源分支：`development`
- 来源提交：`200f4ef04c684c4da3c7ea3704640ecdd7bcbdbd`
- 来源目录：`lab/`
- 本次迁移日期：2026-11-22

## 当前迁移范围
完整迁移 development 分支的 `lab/` 目录，共 38 个文件，保留原始目录结构、相对链接、CSS 和 ES Module 依赖。

包含 11 个独立页面：
- EXP-001：汇率 API 浏览器直连
- EXP-002：股票与 ETF 行情 API
- EXP-003：金额精度与换算
- EXP-004：日期与日本交易日
- EXP-005：IndexedDB
- EXP-006：JSON 备份与恢复
- EXP-007：输入验证与 XSS 防护
- EXP-008：浏览器请求治理
- EXP-009：本地文件与下载
- EXP-010：IndexedDB schema 迁移
- WIKI：NISA Wiki 原型（含 WIKI-002 备注）

入口：主界面顶部「测试画面」按钮 → 测试画面列表（`test-screens.html`）→ 选择「testNisa」→ `testnisa-lab/index.html`。

测试画面列表写在 `test-screens.html` 的 `TEST_SCREENS` 数组里，后续新增测试画面直接往这个数组里追加一行即可（`id`、`name`、`description`、`url`）。

## 迁移规则
1. 在 testNisa 中完成原型开发后，再按需同步页面及其相对依赖。
2. 保持源目录结构和相对引用，避免破坏 ES Module、样式及页面导航。
3. 本目录演练修改不自动回写 testNisa；确认后再单独整理回源项目。
4. GitHub Pages 为公开访问环境，不放券商账号、密钥、私人投资数据或其他秘密。
5. 每次同步记录源仓库提交 SHA、迁移日期、迁移文件和演练调整。
6. 默认按漫漫计划的 AI 协作指南与 Git 分支工作流执行开发、必要检查、PR 合并和部署确认；只有遇到权限、重大风险、需求歧义或无法自行解决的阻碍时才暂停沟通。

## 安全提示
- EXP-002 股票行情页面由使用者在页面运行时输入 Alpha Vantage API Key；页面代码不持久化保存该密钥，但请求会将 Key 放在 URL 查询参数中。
- URL 查询参数可能出现在浏览器开发者工具、请求日志或截图中；不要分享包含真实密钥的截图、链接或日志。建议仅使用可撤销的测试密钥。
- Pages 是公开访问环境；不得把任何密钥、券商凭据或私人投资数据写入 HTML、JavaScript、提交记录或文档。

## 当前状态
- [x] 建立漫漫计划独立入口
- [x] 迁移 development 分支完整 lab/ 目录（38 个文件、11 个页面）
- [x] 完成代码检查和 PR 变更核对
- [x] 完成本次 PR 合并（PR #68）
- [x] 确认 GitHub Pages 部署成功（Pages Run #333，2026-11-22，commit `6a0533277cd4e22043a5db9f44708133dd6ca081`）
- [ ] 浏览器逐页验收；外部 API / CORS 结果以实际浏览器环境为准

画面验收由用户方便时进行，不作为阻断其他独立开发工作的前置条件。未实际完成的浏览器验收不得标记为通过。
