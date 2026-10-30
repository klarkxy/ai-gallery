#!/usr/bin/env node
// AI 参考图库检索与取图。零依赖，Node 18+。
// 检索词按源站原文做字面子串匹配。
// 只缓存元数据索引；图片按 id 顺序下载，间隔 1.5 秒。
// 用法见 SKILL.md，或运行 `node ref.mjs help`。

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const UA = 'ai-reference-library-skill/1.2';
const CACHE_DIR = path.join(os.tmpdir(), 'ai-reference-library-cache');
const TTL_MS = 24 * 3600 * 1000;
const DELAY_MS = 1500;
const REF_LOG = '_refs.jsonl';

// 源站「アングル」原值 → 统一视角名；命令行两种写法都收
const ANGLE = { '正面': 'front', '上から': 'high', '下から': 'low', '横': 'side', '斜め': 'diag',
  front: 'front', high: 'high', low: 'low', side: 'side', diag: 'diag' };

const LIBS = {
  pose: {
    site: 'https://ai-pose-gallery.pages.dev/', terms: 'ギア POSE-DB-01：单张作生成参考可商用；禁止批量/自动下载与再分发',
    load: async () => inlineD(await text('https://ai-pose-gallery.pages.dev/')).map(r => poseRec(r, 'https://ai-pose-gallery.pages.dev/')),
  },
  depth: {
    site: 'https://ai-pose-depth-gallery.pages.dev/', terms: 'ギア POSE-DB-02（depth）：同 pose 条款',
    load: async () => inlineD(await text('https://ai-pose-depth-gallery.pages.dev/')).map(r => poseRec(r, 'https://ai-pose-depth-gallery.pages.dev/')),
  },
  costume: {
    site: 'https://ai-costume-gallery.pages.dev/', terms: 'ギア COSTUME-DB-01：同 pose 条款',
    load: async () => inlineD(await text('https://ai-costume-gallery.pages.dev/')).map(r => {
      const b = 'https://ai-costume-gallery.pages.dev/';
      return { id: r.id, group: r['カテゴリ'], cat: r['カテゴリ'], name: r['キーワード'], angle: '',
        url: b + r['原寸'], urlSmall: b + r['画像'], ext: 'png', extSmall: 'webp' };
    }),
  },
  face: {
    site: 'https://ai-portrait-gallery.pages.dev/', terms: 'あぎ 人脸库：CC0，可商用',
    load: async () => {
      const js = await text('https://ai-portrait-gallery.pages.dev/data/images.js');
      const arr = JSON.parse(js.slice(js.indexOf('['), js.lastIndexOf(']') + 1));
      const b = 'https://ai-portrait-gallery.pages.dev/';
      return arr.map(r => ({ id: r.id, group: r.section, cat: r.hair, name: r.style || '', angle: '',
        url: b + r.full, urlSmall: b + r.thumb, ext: 'png', extSmall: 'webp' }));
    },
  },
  shisei: {
    site: 'https://shisei.indaloop.app/', terms: 'wquguru/shisei：图片 CC0 1.0，可批量入库、商用、再分发',
    load: async () => {
      const cat = JSON.parse(await text('https://raw.githubusercontent.com/wquguru/shisei/main/data/catalog.json'));
      const b = 'https://raw.githubusercontent.com/wquguru/shisei/main/images/line/';
      const out = [];
      for (const p of cat) for (const [v, f] of Object.entries(p.views || {})) {
        if (!f) continue; // 未通过质检的视角为 null
        out.push({ id: `${p.series}_${p.id}_${v}`, group: p.series, cat: `${p.class_cn} ${p.class_en} ${p.class_jp}`,
          name: `${p.name_cn} / ${p.name_en} / ${p.name_jp}`, angle: ANGLE[v] || v,
          url: b + 'w900/' + f, urlSmall: b + 'w600/' + f, ext: 'webp', extSmall: 'webp' });
      }
      return out;
    },
  },
};

function poseRec(r, b) {
  return { id: r.id, group: r['系統'], cat: r['分類'], name: r['ポーズ名'], angle: ANGLE[r['アングル']] || r['アングル'],
    url: b + r['原寸'], urlSmall: b + r['サムネ'], ext: 'png', extSmall: 'jpg' };
}

function inlineD(html) {
  const s = html.indexOf('const D=');
  if (s < 0) throw new Error('源站结构变了：找不到 const D=');
  const start = s + 'const D='.length;
  const end = html.indexOf('];', start) + 1;
  return JSON.parse(html.slice(start, end));
}

async function text(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.text();
}

async function index(lib, refresh) {
  const L = LIBS[lib];
  if (!L) throw new Error(`未知库 ${lib}；可选 ${Object.keys(LIBS).join(' / ')}`);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const f = path.join(CACHE_DIR, `${lib}.json`);
  if (!refresh && fs.existsSync(f) && Date.now() - fs.statSync(f).mtimeMs < TTL_MS) return JSON.parse(fs.readFileSync(f, 'utf8'));
  const recs = await L.load();
  fs.writeFileSync(f, JSON.stringify(recs));
  return recs;
}

function parseArgs(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) o[k] = true; else { o[k] = n; i++; }
    } else o._.push(a);
  }
  return o;
}

// 检索词原样切分，不做任何翻译；多词之间是「且」
function tokens(q) {
  return String(q || '').toLowerCase().split(/[\s,，、]+/).filter(Boolean);
}

async function cmdCats(o) {
  const lib = o._[1];
  const recs = await index(lib, o.refresh);
  const m = new Map();
  for (const r of recs) { const k = `${r.group} / ${r.cat}`; m.set(k, (m.get(k) || 0) + 1); }
  console.log(`# ${lib} 的体系 / 分类（条数）——把这些原文直接拿去 search`);
  for (const [k, n] of [...m].sort()) console.log(`${k}\t${n}`);
}

async function cmdSearch(o) {
  const lib = o._[1];
  const recs = await index(lib, o.refresh);
  const ts = tokens(o._.slice(2).join(' '));
  const angle = o.angle ? (ANGLE[o.angle] || o.angle) : null;
  const limit = Number(o.limit || 20);
  let hits = recs.filter(r => !angle || r.angle === angle);
  if (o.group) { const g = String(o.group).toLowerCase(); hits = hits.filter(r => r.group.toLowerCase().includes(g)); }
  hits = hits.filter(r => { const h = `${r.id} ${r.group} ${r.cat} ${r.name}`.toLowerCase(); return ts.every(t => h.includes(t)); });
  console.log(`# ${lib}: ${hits.length} 条命中（共 ${recs.length}）`);
  console.log(`# 条款：${LIBS[lib].terms}`);
  console.log(`# 浏览：${LIBS[lib].site}`);
  if (!hits.length) console.log(`# 0 命中：先 cats ${lib} 看实际分类名，再原样检索`);
  for (const r of hits.slice(0, limit)) console.log([r.id, r.group, r.cat, r.name, r.angle].filter(Boolean).join(' | '));
  if (hits.length > limit) console.log(`# …其余 ${hits.length - limit} 条，用更具体的词收窄或加 --limit`);
}

async function cmdGet(o) {
  const lib = o._[1];
  const ids = o._.slice(2);
  if (!ids.length) throw new Error('需要至少一个 id');
  const recs = await index(lib, false);
  const out = path.resolve(o.out || 'refs');
  fs.mkdirSync(out, { recursive: true });
  const small = !!o.small;
  const log = path.join(out, REF_LOG);
  for (let i = 0; i < ids.length; i++) {
    const r = recs.find(x => x.id === ids[i]);
    if (!r) { console.log(`✗ ${ids[i]} 不在 ${lib} 索引里（先 search）`); continue; }
    const url = small ? r.urlSmall : r.url;
    const file = path.join(out, `${lib}_${r.id}.${small ? r.extSmall : r.ext}`);
    if (fs.existsSync(file)) { console.log(`= ${file}（已存在，复用）`); continue; }
    if (i > 0) await new Promise(s => setTimeout(s, DELAY_MS));
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) { console.log(`✗ ${r.id} HTTP ${res.status}`); continue; }
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    fs.appendFileSync(log, JSON.stringify({ lib, id: r.id, name: r.name, url, file: path.basename(file), at: new Date().toISOString() }) + '\n');
    console.log(`✓ ${file}`);
  }
}

function help() {
  console.log(`node ref.mjs search <pose|depth|costume|face|shisei> <原文关键词…> [--angle front|high|low|side|diag] [--group 体系] [--limit 20] [--refresh]
node ref.mjs cats <库>          # 列出体系/分类原文，查不到时先看这个
node ref.mjs get <库> <id> [id…] [--out refs] [--small]
node ref.mjs info

检索词用源站原文：pose/depth/face 日文，costume 英文，shisei 中英日皆可。`);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const c = o._[0];
  if (c === 'search') return cmdSearch(o);
  if (c === 'get') return cmdGet(o);
  if (c === 'cats') return cmdCats(o);
  if (c === 'info') { for (const [k, v] of Object.entries(LIBS)) console.log(`${k}\t${v.site}\t${v.terms}`); return; }
  help();
}

main().catch(e => { console.error('错误：' + e.message); process.exit(1); });
