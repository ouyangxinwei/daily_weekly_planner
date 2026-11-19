# V10.38 影响分析：托业题库

| 范围 | 影响 |
|---|---|
| `language-workspace.js` | 新增托业题库页、`exam` 规范化、点选记录；V2.0.0 → V2.1.0。原有页面逻辑不变，只有卡片预览和详情页对带 `exam` 的条目换了排版 |
| `language-workspace.css` | 只追加 `.lw-set*`、`.lw-part*`、`.lw-exq*`、`.lw-opt*` 等新类，不改旧样式 |
| 数据 | 存储键、schemaVersion 不变。`exam` 和 `settings.toeic` 是可选字段，旧数据照常读取 |
| 计划工作区、云同步 | 不涉及 |
| `index.html` | 只改脚本版本参数 `?v=2.1.0` 和应用版本 |
| 测试 | 新增 `tests/e2e/toeic-workspace.spec.js`（编造示例题）；`language-workspace.spec.js` 的导航选择器限定在 `.lw-nav` 内 |

## 风险

- **回滚到 V10.37**：V2.0.0 的 `normalizeItem` 会保留 `exam` 等额外字段（展开复制），`settings.toeic` 也会保留，所以回滚不会丢失点选记录，只是看不到托业题库页。
- **导入替换全部数据**：导入题库 JSON 会覆盖已有学习内容。工具提供 `--merge`，页面导入前也有确认框。
- **数据量**：7 套 × 2 个 T 约 1.4 MB，低于 5 MB 导入上限；LocalStorage 一般有 5–10 MB。
