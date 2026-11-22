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

入口：`testnisa-lab/index.html`

## 迁移规则
1. 在 testNisa 中完成原型开发后，再按需同步页面及其相对依赖。
2. 保持源目录结构和相对引用，避免破坏 ES Module、样式及页面导航。
3. 本目录演练修改不自动回写 testNisa；确认后再单独整理回源项目。
4. GitHub Pages 为公开访问环境，不放券商账号、密钥、私人投资数据或其他秘密。
5. 每次同步记录源仓库提交 SHA、迁移日期、迁移文件和演练调整。

## 当前状态
- [x] 建立漫漫计划独立入口
- [x] 迁移 development 分支完整 lab/ 目录（38 个文件、11 个页面）
- [ ] 等待本次漫漫计划 Pages 部署
- [ ] 浏览器逐页验收；外部 API / CORS 结果以实际浏览器环境为准
