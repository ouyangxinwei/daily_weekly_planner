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
# 标题写法：第 9–10 套带「CD1 11」，第 11 套起没有；第 12 套写成「Part 1」；题目块叫「問題」或「設問」
QHEAD_RE = re.compile(
    r'^(\d{3})(?: CD(\d+) (\d+))? T(\d+) (?:Pt|Part )(\d+) Q(\d+)(?:-(\d+))?(?: (会話|問題|設問|トーク))?\.mp3$')
QUESTION_KINDS = ('問題', '設問')
# 选项写法：「A) …」或「A. …」（第 7 套起两种混用），输出统一为「A) …」
OPT_RE = re.compile(r'^([A-D])[).]\s+(.*)$')
NUM_RE = re.compile(r'^Number\s+(\d+)\.\s*(.*)$')
# 第 9 套起也有「Question 62-64, refer …」「The question's 38-40, refer …」等写法
INTRO_RE = re.compile(r"^(?:The\s+)?Question(?:s|'s)?\s+(\d+)\s*(?:through|-|–)\s*(\d+),?\s+refer", re.I)
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


# ---------------------------------------------------------------- 单行格式（第 9 套起）
# 第 9–12 套是语音识别稿：一道题的题干和选项写在同一行，选项字母常被识别成
# 「Hey / Be / See」或错写成别的字母（如两个 D）。这里按出现顺序重新编号为 A、B、C、D。
INLINE_OPT_RE = re.compile(
    r'(?:^|(?<=\s))(?:[A-D][.),](?=\s)|Hey\b[.,!]?|Be[.,](?=\s)|See[.,?!](?=\s))')
INLINE_NOISE_RE = re.compile(
    r'\s*\b(?:Go\s+on|Along|On)\s+to the next page\.?|\s*This is the end of the listening test\..*$',
    re.I | re.S)
STEM_NUM_RE = re.compile(r'^(?:The\s+)?(?:Number\s*(?:\d+|[A-Za-z-]+)|#\s*\d+|\d+)\s*[.,?—–-]?\s*', re.I)
SENT_SPLIT_RE = re.compile(r'(?<=[.?!])\s+(?=[-"“A-Z0-9])')


def strip_inline_noise(text: str, removed: Counter) -> str:
    def drop(m):
        removed[m.group(0).strip()[:40]] += 1
        return ''
    return INLINE_NOISE_RE.sub(drop, text).strip()


# 严格规则找不到正确数量的选项时，再用宽松规则试一次（字母后无标点、「be a …」等）
INLINE_OPT_LOOSE_RE = re.compile(
    r'(?:^|(?<=\s))(?:[A-D][.),]?(?=\s+[A-Z0-9])|Hey\b[.,!]?|[Bb]e\b[.,]?|See\b[.,?!]?)')


def split_inline_options(text: str, want: int = 0):
    marks = list(INLINE_OPT_RE.finditer(text))
    if want and len(marks) != want:
        loose = list(INLINE_OPT_LOOSE_RE.finditer(text))
        if len(loose) == want:
            marks = loose
    if not marks:
        return text.strip(), []
    stem = text[:marks[0].start()].strip()
    opts = []
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        opts.append(text[m.end():end].strip())
    return stem, opts


def split_inline_questions(text: str, nums, notes, tag):
    """按已知题号把「Number 32. … Number 33. …」切开；题号缺失时在问号处拆分。"""
    found, start = [], 0
    for n in nums:
        m = (re.compile(rf'(?:Number|#|For)\s*{n}\b[\s.,?:—–-]*', re.I).search(text, start)
             or re.compile(rf'(?<![\d$.])\b{n}\b[\s.,?:—–-]*').search(text, start))
        found.append((n, m))
        if m:
            start = m.end()
    segs = {}
    for i, (n, m) in enumerate(found):
        if m is None:
            continue
        nxt = next((mm.start() for _, mm in found[i + 1:] if mm), len(text))
        segs[n] = text[m.end():nxt].strip()
    for i, (n, m) in enumerate(found):
        if m is not None:
            continue
        prev = nums[i - 1] if i else None
        if prev:
            src = segs.get(prev, '')
        else:
            src = text[:next((mm.start() for _, mm in found if mm), len(text))]
        cut = src.find('? ')
        if prev and cut >= 0:
            segs[prev], segs[n] = src[:cut + 1].strip(), src[cut + 2:].strip()
        else:
            segs[n] = src.strip()
        notes.append(f'{tag} 题目里找不到 Q{n} 的编号，已在问号处拆分，请核对')
    return [(n, segs.get(n, '')) for n in nums]


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
    units, problems, skipped, notes = [], [], [], []
    removed = Counter()
    inline_blocks = 0
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
            if body and not any(OPT_RE.match(ln) for ln in body):
                # 单行格式：题干和选项在同一行
                inline_blocks += 1
                text = strip_inline_noise(' '.join(body), removed)
                want = len(OPT_LETTERS[pt])
                raw_stem, raw_opts = split_inline_options(text, want)
                if len(raw_opts) != want:
                    notes.append(f'Pt{pt} Q{q1} 识别出 {len(raw_opts)} 个选项（应为 {want} 个），请核对')
                opts = [(OPT_LETTERS[pt][i] if i < want else '?', t) for i, t in enumerate(raw_opts)]
                rest = STEM_NUM_RE.sub('', raw_stem, count=1).strip()
                stem = [f'Number {q1}. {rest}'.rstrip()]
            else:
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
            if len(body) == 1:
                # 单行格式：按句子分行，方便阅读
                inline_blocks += 1
                body = [x for x in SENT_SPLIT_RE.split(strip_inline_noise(body[0], removed)) if x]
            g = {'kind': 'group', 'pt': pt, 'q1': q1, 'q2': q2,
                 'script_header': header, 'script': body,
                 'q_header': None, 'questions': None}
            pending[key] = g
            units.append(g)
        elif kind in QUESTION_KINDS:
            g = pending.get(key)
            if g is None:
                problems.append(f'[{header}] 找不到对应的 会話/トーク')
                continue
            qs, cur = [], None
            if len(body) == 1 and len(re.findall(r'(?:Number|#)\s*\d+', body[0], re.I)) != 1:
                inline_blocks += 1
                text = strip_inline_noise(body[0], removed)
                g['q_header'] = header
                g['questions'] = split_inline_questions(text, list(range(q1, q2 + 1)), notes, f'Pt{pt} Q{q1}-{q2}')
                continue
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

    if inline_blocks:
        notes.insert(0, f'单行格式（疑似语音识别稿）{inline_blocks} 块：选项字母已按出现顺序重排为 A–D，'
                        '识别错误的单词无法自动修正，请对照原书检查')
    return units, problems, skipped, removed, notes


# ---------------------------------------------------------------- 校验
def check_units(units, set_no, t_no):
    problems, notes = [], []
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
                if not im:
                    # 部分源文件的原文没有开头的「Questions … refer to …」，不影响导入，只提示
                    notes.append(f'{tag} 原文没有开头的 Questions … refer to … 句（源文件如此）')
                elif (int(im.group(1)), int(im.group(2))) != (q1, q2):
                    notes.append(f'{tag} 原文第一行的题号范围与标题不一致（以标题为准）')
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
    return problems, notes, {pt: len(v) for pt, v in seen.items()}


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
        units, probs, skipped, removed, notes = parse_file(path, set_no, t_no)
        more, more_notes, counts = check_units(units, set_no, t_no)
        probs += more
        notes += more_notes

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
        if notes:
            report += ['提示：'] + [f'- {x}' for x in notes] + ['']
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
