# V10.12 影响分析：自定义分类管理

- index.html：新增分类管理、编辑和删除迁移 UI；分类配置进入状态；新建及快速添加默认使用首项。
- i18n.js：增加中英日静态文案，并排除用户自定义分类名。
- sw.js：升级 PWA 缓存。
- 状态增加 categories 数组，计划 category 字段保持字符串，schemaVersion: 1 不变。
- JSON 与 Supabase 整份快照包含分类；旧数据缺少该字段时回退原有七项，无 SQL 迁移。
- 分类改名／删除迁移同时覆盖 plans 与 trash[].plan；事务保存和撤销机制避免部分写入。
