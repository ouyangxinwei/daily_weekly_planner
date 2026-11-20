# 美股七巨头行情看板（V10.55）

## 展示位置与范围

- 首页计划区域天气预报模块正下方，独立于天气组件。
- 展示 AAPL、MSFT、NVDA、AMZN、GOOGL、META、TSLA 七只股票。
- 每只股票显示最近交易周每日收盘价、最新收盘价、日涨跌、周涨跌；可展开查看每日 OHLCV。
- 桌面双列卡片，窄屏单列；支持简体中文、English、日本語及深色主题。

## 交易周规则

- 日期采用交易所时区 America/New_York。
- 周六、周日以最近一条有效行情所在周为最近交易周。
- 周一至周五若本周已有行情，显示本周截至最新可用交易日的数据；如果本周尚无行情，则回退到最近有数据的一周。
- 日期由行情数据实际返回值决定，不预设周末或节假日交易。若数据源实际返回周末记录，则按日期归入对应周。
- 当天仍在美股常规交易时段内且已返回当日数据时，标注当日行情可能尚未收盘。
- 周涨跌以所选周第一条行情之前的最后一个有效收盘价为基准。

## 数据来源与边界

- 当前版本通过 Supabase Edge Function `stock-market-api` 代理 Yahoo Finance Chart 非官方公开端点。
- 代理固定请求七只股票的 1 个月日线，筛选最近交易周，并统一返回 OHLCV、日涨跌和周涨跌。
- 前端不包含第三方 API Key；当前数据源不需要配置 API Key。
- Edge Function 缓存 10 分钟，浏览器 localStorage 缓存 15 分钟；请求失败时回退到上次缓存，并标注缓存状态。
- Yahoo Finance Chart 是非官方公开接口，不属于有 SLA 的正式行情 API；数据可能延迟、限流或改变。不得把当前实现描述为交易所实时行情或保证持续可用的数据服务。
- 页面显示数据来源和非投资建议说明。若未来用于商业/公开分发并要求稳定授权，应替换为具有明确展示许可的行情供应商（例如完成授权后的 Twelve Data）。
- 本功能不保存股票数据到业务数据库，不修改 company-api、RLS、认证或 planner 同步数据。

## 文件

- `stock-dashboard.js`：前端请求、缓存和卡片渲染。
- `stock-dashboard.css`：组件样式。
- `supabase/functions/stock-market-api/index.ts`：行情代理。
- `supabase/config.toml`：仅新增 stock-market-api 的 JWT 配置。

## 交付状态

V10.55.0。部署与用户验收状态以 GitHub Actions 和 Supabase Edge Function 实际结果为准。
