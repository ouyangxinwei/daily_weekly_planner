# 开发日记 V1

日记记录已经发生的活动；计划和任务用于未来安排。每件事独立成条，不设置完成状态或截止日期。

## 数据与认证
- 数据表：public.diary_entries；user_id 为现有 planner_credentials.username（text），与当前自定义账号体系一致。
- 字段：date、title、content、category、tags text[]、duration_min、created_at、updated_at。
- 分类：tech / invest / language / life / other；最多5个标签。
- 当前应用使用 planner_login 用户名/密码 RPC，并非 Supabase Auth。每个 planner_diary_* RPC 都调用 planner_check_password，并按验证后的 p_username 限定 CRUD。
- 表启用 RLS，普通客户端角色没有直接表权限；只能调用经账号密码验证的 RPC。密码只在运行会话内存中使用，不写入 LocalStorage。

## V1
日/周视图、完整七天周回顾、空白日、周导航、回到本周、补记、编辑、删除、标题/详情/标签历史搜索（最多50条）、固定分类筛选、三语、深色和移动端。

## 数据隔离
日记不进入计划 JSON 备份或云端快照；不修改 plans/tasks/company_records、天气或股票模块。日记请求失败只影响日记区域。

## V2 暂缓
月视图、统计、标签管理、导出、全文搜索和任务关联。
