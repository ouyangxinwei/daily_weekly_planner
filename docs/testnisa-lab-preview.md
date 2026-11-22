# testNisa 演练区（漫漫计划部署副本）

## 用途
通过漫漫计划现有 GitHub Pages 环境，提前演练 testNisa 的独立技术实验页面。本目录是副本，不是 testNisa 正式源码，也不会自动同步。

## 来源
- 源仓库：`ouyangxinwei/testNisa`（私有仓库）
- 来源分支：`main`
- 来源目录：`lab/`

## 当前迁移页面
- `testnisa-lab/index.html`：实验目录
- `testnisa-lab/api/currency.html`：EXP-001 汇率 API 浏览器直连
- `testnisa-lab/utilities/calculator.html`：EXP-003 金额精度与换算
- 保留页面使用的 JavaScript 模块和 CSS 资源。

## 迁移规则
1. 在 testNisa 中完成原型开发后，再按需复制页面及相对依赖。
2. 保持源目录结构和相对引用，避免破坏 ES module、样式及页面导航。
3. 本目录演练修改不自动回写 testNisa；确认后再单独整理回源项目。
4. 不放券商账号、密钥、私人投资数据或其他秘密。GitHub Pages 为公开访问环境。
5. 每次同步记录源仓库提交 SHA、迁移日期、迁移文件和演练调整。

## 当前状态
- [x] 建立独立入口和两个实验页面副本
- [ ] 等待漫漫计划 Pages 部署
- [ ] 浏览器验证汇率 API 请求、CORS 和结果显示
- [ ] 浏览器验证金额精度计算与边界案例
