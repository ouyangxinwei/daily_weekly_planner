# V10.2 影响分析：移除登录失败锁定

## 变更范围
- `docs/supabase-setup.sql`：新建数据库时不创建失败次数表，校验函数直接比对 bcrypt 摘要。
- `docs/migration_V10.2_remove_login_lockout.sql`：替换既有校验函数、删除旧的 `planner_login_attempts` 表并重申 RPC 执行权限。
- `README.md`、`CHANGELOG.md` 及需求、验收、技术说明、部署排障文档：更新升级步骤与行为说明。
- `sw.js`：更改缓存名称，避免浏览器继续使用旧版本资源。
- `index.html`：登录调用和 RPC 参数保持不变，不需要改动前端接口。

## 数据与兼容性
- 不修改 `planner_credentials`、`planner_cloud_data` 中的账号或计划数据。
- 不改变 `planner_login`、`planner_get_data`、`planner_put_data` 的签名。
- 迁移删除的仅是失败计数/锁定状态表 `planner_login_attempts`。
- 现有账号密码摘要继续有效，无需重新设置密码。

## 风险与限制
- 取消应用层失败次数锁定会减少对密码猜测的防护；需确保密码强度及数据库权限配置。
- 该变更不能关闭 Supabase 平台、代理或网络层独立实施的限制。
- 真实 Supabase 未在本环境连接验证；迁移必须在项目 SQL Editor 执行后进行验收。

## 回滚思路
如需恢复旧规则，必须重新创建失败统计表并恢复旧版函数定义；仅恢复前端 ZIP 不会恢复数据库函数。因此建议在执行迁移前保存当前 SQL 定义/数据库备份。
