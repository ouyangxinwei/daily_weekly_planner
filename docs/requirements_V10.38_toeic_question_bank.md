# V10.38 需求：外语学习工作区 · 托业题库

状态：已实现（来源：用户提供的《托业听力题库整理与导入项目 开发文档 v0.8》、toeic-tab.patch、toeic_tool.py）

## 1. 目标

把托业听力题（第 6–12 套，每套 T1、T2，只含 Pt1–Pt4）整理后导入外语学习工作区，在页面里按「套 → T → Part」浏览和做题。

## 2. 版权与存放

- 题目内容有版权，只在本地和浏览器里使用，**不提交进公开仓库**。仓库只放代码、工具和用编造示例写的测试。
- `.gitignore` 排除 `tools/input/`、`tools/output/`、`language-workspace-import.json`、`language-study-backup-*.json`。

## 3. 页面需求

| 需求 | 做法 |
|---|---|
| 层级浏览 | 第一层：第 N 套的 T1/T2；第二层：Pt1–Pt4（题数、页数/组数、进度条）；第三层：题目页。每层有面包屑 |
| 题组一页 | Pt3、Pt4 每组 3 题一页，有题组标签和上一组/下一组；Pt1 每页 6 题，Pt2 每页 5 题 |
| 原文与题目分开 | 原文默认折叠；卡片预览只显示题目 |
| 点选判对错 | 有答案（A–D 开头）时标对错并显示解析；没有答案时只记录选择 |
| 点选记录 | 保存在 `settings.toeic.picks`（题目 id → 字母），随备份导出、导入；可清除本组/本页；首次点选进入「学习中」 |
| 其他 | 占位选项弱化显示；含图表的题加标注；详情页、练习中心使用同样的排版 |

## 4. 数据格式

沿用 schemaVersion 2 和存储键 `personal-language-study-workspace:v1`。条目新增可选字段：

```json
"exam": { "set": 6, "test": 1, "part": 3, "number": 44, "groupStart": 44, "groupEnd": 46 }
```

- 没有 `exam` 时按 id `toeic-s{套2位}-t{T}-pt{部分}-q{题号3位}` 推算；Pt3 从 32、Pt4 从 71 起每 3 题一组。
- 无效的 `exam`（非正整数、Part 不在 1–4、题号不在题组内）会被丢弃，条目按普通内容处理。
- Pt3、Pt4 的 `prompt` 写成 `【原文】…【题目】…`，页面拆开显示。
- 正确答案写在 `answer`，以 A–D 开头再接结尾或标点才算选项字母（`C`、`C) …`），避免把 “A man is…” 误判。

## 5. 整理工具 `tools/toeic_tool.py`

Python 3，无第三方依赖。源文件名必须形如 `6_T1.txt`（套号_T序号）。

```bash
python3 -I tools/toeic_tool.py tools/input/6_T1.txt tools/input/6_T2.txt -o tools/output
python3 -I tools/toeic_tool.py tools/input/7_T1.txt -o tools/output --merge 已导出的备份.json
```

输出整理后的文本、`language-workspace-import.json`、`TODO_missing_options.txt`、`validation_report.txt`。校验不通过时以非零状态退出。

**注意：页面导入会替换整个工作区。** 已有自己的学习内容时，先导出备份，再用 `--merge` 合并后导入。

## 6. 不在本版范围

- 批量填写答案和 Pt3/Pt4 选项（待有答案来源后再定格式，例如每行 `6_T1 Pt3 Q44 = B`）。
- 音频播放、图表图片、云同步。
