# 开发日记 V1

日记记录已经发生的活动，计划和任务记录未来安排。每件事独立成条，不设置完成状态或截止日期。

- 数据表：public.diary_entries；字段包括业务日期、标题、详情、分类、tags text[]、duration_min、created_at、updated_at。
- 分类：tech / invest / language / life / other；标签最多5个。
- 支持日/周视图、完整七天周回顾、空白日、前后周切换、回到本周、历史补记、编辑、删除、标题/详情/标签搜索（最多50条）和分类筛选。
- 现有系统使用自定义 planner_login 用户名/密码认证，并非 Supabase Auth。owner_username 关联 planner_credentials.username。diary_api 每次调用验证 planner_check_password，并从已验证账号推导数据所有权。表启用 RLS 且撤销客户端直接表权限。密码不保存在 LocalStorage。
- 日记不进入计划 JSON 备份或云端快照，不修改 plans/tasks/company_records、天气或股票模块。
- V2 月视图、统计、标签管理、导出、全文搜索和任务关联暂不实施。
