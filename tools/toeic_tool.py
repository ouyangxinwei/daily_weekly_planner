#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
托业（TOEIC）听力题文本整理工具

输入：形如 6_T1.txt、6_T2.txt 的源文件（文件名 = 套号_T序号）。
输出（在 -o 指定的目录里）：
  6_T1.txt, 6_T2.txt            整理后的文本（只含 Pt1–Pt4，已去掉固定句子，Pt3/Pt4 补了占位选项）
  language-workspace-import.json 可在学习页面"数据管理 → 导入"的 JSON（schemaVersion 2）
  TODO_missing_options.txt      待补充清单
  validation_report.txt         校验报告

用法：
  python3 -I toeic_tool.py input/6_T1.txt input/6_T2.txt -o output
  python3 -I toeic_tool.py input/7_T1.txt -o output --merge 已导出的备份.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PART_NAMES = {1: '照片题', 2: '应答题', 3: '对话', 4: '独白'}
# 每个部分的题号范围（标准托业听力）
EXPECT = {1: (1, 6), 2: (7, 31), 3: (32, 70), 4: (71, 100)}
OPT_LETTERS = {1: 'ABCD', 2: 'ABC', 3: 'ABCD', 4: 'ABCD'}
SCRIPT_KINDS = ('会話', 'トーク')

HEADER_RE = re.compile(r'^=====\s*(.*?)\s*=====\s*$')
QHEAD_RE = re.compile(
    r'^(\d{3}) CD(\d+) (\d+) T(\d+) Pt(\d+) Q(\d+)(?:-(\d+))?(?: (会話|問題|トーク))?\.mp3$')
OPT_RE = re.compile(r'^([A-D])\)\s*(.*)$')
NUM_RE = re.compile(r'^Number\s+(\d+)\.\s*(.*)$')
INTRO_RE = re.compile(r'^Questions\s+(\d+)\s*(?:through|-|–)\s*(\d+)\s+refer to', re.I)
FILENAME_RE = re.compile(r'(\d+)_T(\d+)\.txt$', re.I)


def norm(s: str) -> str:
    """去掉引号和多余空白后转小写，用来比较固定句子。"""
    return re.sub(r'[\s“”"]+', ' ', s).strip().lower()


# 需要整行去掉的固定句子（比较时已规范化）
NOISE = {
    norm('Go on to the next page.'),
    norm('This is the end of the listening test. Turn to Part 5 in your test book.'),
    norm('End of recording.'),
}


def placeholder(set_no: int, t_no: int, pt: int, num: int, letter: str) -> str:
    return f'[待补充 {set_no}_T{t_no}_pt{pt}_num{num}_{letter}]'


# ---------------------------------------------------------------- 解析
def split_blocks(text: str):
    blocks = []
    cur = None
    for raw in text.splitlines():
        m = HEADER_RE.match(raw.strip())
        if m:
            cur = [m.group(1), []]
            blocks.append(cur)
        elif cur is not None:
            cur[1].append(raw)
    return blocks


def clean_body(lines, removed: Counter):
    out = []
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        if norm(s) in NOISE:
            removed[s.strip('“”"')] += 1
            continue
        out.append(s)
    return out


def parse_file(path: Path, set_no: int, t_no: int):
    text = path.read_text(encoding='utf-8-sig')
    blocks = split_blocks(text)
    units, problems, skipped = [], [], []
    removed = Counter()
    pending = {}  # (pt, q1, q2) -> group（等待配对的 会話/トーク）

    for header, body_raw in blocks:
        m = QHEAD_RE.match(header)
        if not m:
            skipped.append(header)  # 说明块、Test 标题等
            continue
        _seq, _cd, _trk, t, pt, q1, q2, kind = m.groups()
        t, pt, q1 = int(t), int(pt), int(q1)
        q2 = int(q2) if q2 else None
        if t != t_no:
            problems.append(f'[{header}] 标题里的 T{t} 与文件名 T{t_no} 不一致')
        if pt not in PART_NAMES:
            skipped.append(header)  # Pt5 以上不处理
            continue
        body = clean_body(body_raw, removed)

        if pt in (1, 2):
            if kind or q2:
                problems.append(f'[{header}] Pt{pt} 不应带范围或类型')
                continue
            stem, opts = [], []
            for ln in body:
                om = OPT_RE.match(ln)
                if om:
                    opts.append((om.group(1), om.group(2).strip()))
                elif opts:
                    problems.append(f'[{header}] 选项后出现多余行: {ln[:40]}')
                else:
                    stem.append(ln)
            nm = NUM_RE.match(stem[0]) if stem else None
            if not nm or int(nm.group(1)) != q1:
                problems.append(f'[{header}] 题干编号与标题 Q{q1} 不一致')
            units.append({
                'kind': 'single', 'pt': pt, 'num': q1, 'header': header,
                'stem': ' '.join(stem), 'options': opts,
            })
            continue

        # Pt3 / Pt4
        if q2 is None:
            problems.append(f'[{header}] Pt{pt} 缺少题号范围')
            continue
        key = (pt, q1, q2)
        if kind in SCRIPT_KINDS:
            g = {'kind': 'group', 'pt': pt, 'q1': q1, 'q2': q2,
                 'script_header': header, 'script': body,
                 'q_header': None, 'questions': None}
            pending[key] = g
            units.append(g)
        elif kind == '問題':
            g = pending.get(key)
            if g is None:
                problems.append(f'[{header}] 找不到对应的 会話/トーク')
                continue
            qs, cur = [], None
            for ln in body:
                nm = NUM_RE.match(ln)
                if nm:
                    cur = [int(nm.group(1)), nm.group(2).strip()]
                    qs.append(cur)
                elif cur is not None:
                    cur[1] += ' ' + ln  # 题干折行
                else:
                    problems.append(f'[{header}] 题目前出现多余行: {ln[:40]}')
            g['q_header'] = header
            g['questions'] = [(n, s) for n, s in qs]
        else:
            problems.append(f'[{header}] Pt{pt} 缺少 会話/トーク/問題 标记')

    return units, problems, skipped, removed


# ---------------------------------------------------------------- 校验
def check_units(units, set_no, t_no):
    problems = []
    seen = {pt: [] for pt in PART_NAMES}
    for u in units:
        pt = u['pt']
        if u['kind'] == 'single':
            seen[pt].append(u['num'])
            letters = ''.join(l for l, _ in u['options'])
            if letters != OPT_LETTERS[pt]:
                problems.append(f"Pt{pt} Q{u['num']} 选项应为 {OPT_LETTERS[pt]}，实际 {letters or '无'}")
            for l, txt in u['options']:
                if not txt:
                    problems.append(f"Pt{pt} Q{u['num']} 选项 {l} 内容为空")
        else:
            q1, q2 = u['q1'], u['q2']
            tag = f'Pt{pt} Q{q1}-{q2}'
            if u['questions'] is None:
                problems.append(f'{tag} 有原文但缺少 問題 块')
                continue
            nums = [n for n, _ in u['questions']]
            if nums != list(range(q1, q2 + 1)):
                problems.append(f'{tag} 题号与范围不符: {nums}')
            if q2 - q1 != 2:
                problems.append(f'{tag} 不是 3 道题一组')
            seen[pt].extend(nums)
            if not u['script']:
                problems.append(f'{tag} 原文为空')
            else:
                im = INTRO_RE.match(u['script'][0])
                if not im or (int(im.group(1)), int(im.group(2))) != (q1, q2):
                    problems.append(f'{tag} 原文第一行的题号范围与标题不一致')
    for pt, (lo, hi) in EXPECT.items():
        got = seen[pt]
        dup = sorted(n for n, c in Counter(got).items() if c > 1)
        missing = sorted(set(range(lo, hi + 1)) - set(got))
        extra = sorted(set(got) - set(range(lo, hi + 1)))
        if dup:
            problems.append(f'Pt{pt} 题号重复: {dup}')
        if missing:
            problems.append(f'Pt{pt} 缺少题号: {missing}')
        if extra:
            problems.append(f'Pt{pt} 出现范围外题号: {extra}')
    return problems, {pt: len(v) for pt, v in seen.items()}


# ---------------------------------------------------------------- 输出：文本
def question_lines(set_no, t_no, pt, num, text):
    lines = [f'Number {num}. {text}']
    for letter in OPT_LETTERS[pt]:
        lines.append(f'{letter}) {placeholder(set_no, t_no, pt, num, letter)}')
    return lines


def render_text(set_no, t_no, units):
    out = [f'# 第{set_no}套 T{t_no}（自动整理，仅 Pt1–Pt4）', '']
    cur = None
    for u in units:
        if u['pt'] != cur:
            cur = u['pt']
            out += [f'########## Pt{cur} {PART_NAMES[cur]} ##########', '']
        if u['kind'] == 'single':
            out.append(f"===== {u['header']} =====")
            out.append(u['stem'])
            out += [f'{l}) {t}' for l, t in u['options']]
            out.append('')
        else:
            out.append(f"===== {u['script_header']} =====")
            out += u['script']
            out.append('')
            out.append(f"===== {u['q_header']} =====")
            for i, (n, s) in enumerate(u['questions']):
                if i:
                    out.append('')
                out += question_lines(set_no, t_no, u['pt'], n, s)
            out.append('')
    return '\n'.join(out).rstrip() + '\n'


# ---------------------------------------------------------------- 输出：JSON
def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')


def make_item(set_no, t_no, pt, num, prompt, options, source, ts, group=None):
    # exam：学习页面"托业题库"用它定位套 / T / Part / 题号 / 题组，不要手工改
    exam = {'set': set_no, 'test': t_no, 'part': pt, 'number': num}
    if group:
        exam['groupStart'], exam['groupEnd'] = group
    return {
        'id': f'toeic-s{set_no:02d}-t{t_no}-pt{pt}-q{num:03d}',
        'title': f'第{set_no}套 T{t_no} Pt{pt} Q{num}',
        'language': '英语',
        'type': 'listening',
        'category': f'Pt{pt} {PART_NAMES[pt]}',
        'unit': f'第{set_no}套 T{t_no}',
        'level': '',
        'prompt': prompt,
        'options': options,
        'answer': '',
        'notes': '',
        'status': 'not_started',
        'lastStudiedAt': None,
        'createdAt': ts,
        'updatedAt': ts,
        'exam': exam,
        'source': source,
    }


def build_items(set_no, t_no, units, ts):
    items = []
    for u in units:
        pt = u['pt']
        if u['kind'] == 'single':
            opts = [f'{l}) {t}' for l, t in u['options']]
            items.append(make_item(set_no, t_no, pt, u['num'], u['stem'], opts,
                                   u['header'], ts))
        elif u['questions']:
            script = '\n'.join(u['script'])
            for n, s in u['questions']:
                opts = [f'{l}) {placeholder(set_no, t_no, pt, n, l)}' for l in OPT_LETTERS[pt]]
                prompt = f'【原文】\n{script}\n\n【题目】\nNumber {n}. {s}'
                items.append(make_item(set_no, t_no, pt, n, prompt, opts,
                                       f"{u['script_header']} | {u['q_header']}", ts,
                                       group=(u['q1'], u['q2'])))
    return items


def build_json(all_items, merge_path=None):
    ts = now_iso()
    doc = {
        'schemaVersion': 2,
        'moduleType': 'language-workspace',
        'app': 'daily-weekly-planner-language-workspace',
        'workspaceVersion': '2.0.0',
        'exportedAt': ts,
        'items': all_items,
        'records': [],
        'notes': [],
        'settings': {'activeTab': 'home'},
    }
    added = len(all_items)
    if merge_path:
        old = json.loads(Path(merge_path).read_text(encoding='utf-8'))
        if old.get('moduleType') not in (None, 'language-workspace'):
            raise SystemExit('--merge 指定的文件不是外语学习工作区的备份')
        if old.get('schemaVersion') != 2:
            raise SystemExit('--merge 只支持 schemaVersion 2 的备份（请先在页面里导出最新备份）')
        have = {x.get('id') for x in old.get('items', [])}
        new_items = [x for x in all_items if x['id'] not in have]
        added = len(new_items)
        old['items'] = old.get('items', []) + new_items  # 已有条目原样保留
        old['exportedAt'] = ts
        doc = old
    return doc, added


# ---------------------------------------------------------------- 输出：待补充清单
def build_todo(parsed):
    lines = ['# 待补充清单', '']
    n_opt = 0
    sec = ['## 一、缺选项 A–D 的题（Pt3、Pt4）', '',
           '把文本里的占位符 `[待补充 …]` 换成真正的选项内容。'
           '标注"含图表"的题，选项在图片里，需要看图补充。', '']
    for (set_no, t_no), units in parsed:
        for u in units:
            if u['kind'] != 'group' or not u['questions']:
                continue
            for n, s in u['questions']:
                graphic = '  【含图表：选项在图片里】' if 'look at the graphic' in s.lower() else ''
                sec.append(f"- {set_no}_T{t_no} Pt{u['pt']} Q{n}  "
                           f"占位符 {set_no}_T{t_no}_pt{u['pt']}_num{n}_A ~ D{graphic}")
                n_opt += 1
    lines += sec[:2] + [f'共 {n_opt} 题。'] + sec[2:]
    total = sum(1 for _k, us in parsed for u in us
                for _ in ([1] if u['kind'] == 'single' else (u['questions'] or [])))
    lines += ['', '## 二、缺正确答案的题（Pt1–Pt4 全部）', '',
              f'共 {total} 题。源文件里没有任何一题的正确答案，导入后 `answer` 为空，页面显示"尚未填写"。',
              '']
    return '\n'.join(lines)


# ---------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser(description='托业听力题整理工具')
    ap.add_argument('inputs', nargs='+', help='源文件，文件名形如 6_T1.txt')
    ap.add_argument('-o', '--out', required=True, help='输出目录')
    ap.add_argument('--merge', help='把结果合并进已有的备份 JSON（schemaVersion 2）')
    args = ap.parse_args()
    # Windows 日文 / 中文控制台默认编码（cp932、gbk）无法输出全部中文，统一用 UTF-8
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    ts = now_iso()
    parsed, all_items, report = [], [], ['# 校验报告', '']
    any_problem = False

    for p in args.inputs:
        path = Path(p)
        fm = FILENAME_RE.search(path.name)
        if not fm:
            sys.exit(f'文件名需要形如 6_T1.txt：{path.name}')
        set_no, t_no = int(fm.group(1)), int(fm.group(2))
        units, probs, skipped, removed = parse_file(path, set_no, t_no)
        more, counts = check_units(units, set_no, t_no)
        probs += more

        text = render_text(set_no, t_no, units)
        (out / f'{set_no}_T{t_no}.txt').write_text(text, encoding='utf-8')
        # 输出里不应再有固定句子或 Pt5 以后的内容
        for line in text.splitlines():
            if norm(line) in NOISE:
                probs.append(f'输出里仍残留固定句子: {line}')
        items = build_items(set_no, t_no, units, ts)
        all_items += items
        parsed.append(((set_no, t_no), units))

        report += [f'## {path.name}（第{set_no}套 T{t_no}）', '',
                   '各部分题数（期望 6 / 25 / 39 / 30）：' +
                   ' / '.join(f'Pt{pt}={counts[pt]}' for pt in PART_NAMES),
                   f'生成条目数：{len(items)}',
                   '去掉的固定句子：' + (', '.join(f'{k} ×{v}' for k, v in removed.items()) or '无'),
                   f'跳过的块（说明、Test 标题、Pt5 以上）：{len(skipped)} 个', '']
        if probs:
            any_problem = True
            report += ['**发现问题：**'] + [f'- {x}' for x in probs] + ['']
        else:
            report += ['校验通过。', '']

    doc, added = build_json(all_items, args.merge)
    data = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
    (out / 'language-workspace-import.json').write_text(data, encoding='utf-8')
    (out / 'TODO_missing_options.txt').write_text(build_todo(parsed), encoding='utf-8')
    size = len(data.encode('utf-8'))
    report += [f'导入 JSON：共 {len(doc["items"])} 条（本次新增 {added} 条），'
               f'{size / 1024:.0f} KB（页面导入上限 5 MB）']
    if size > 4 * 1024 * 1024:
        report.append('注意：已超过 4 MB，接近页面 5 MB 的导入上限。')
    (out / 'validation_report.txt').write_text('\n'.join(report) + '\n', encoding='utf-8')
    print('\n'.join(report))
    sys.exit(1 if any_problem else 0)


if __name__ == '__main__':
    main()
