# ai-gallery

**非官方项目 / Unofficial.** 与下列各图库的作者无任何关联，也不代表其立场；本仓库只按各站公开条款取用图片作生成参考，图片本身的版权与授权归各站作者，详见 [references/terms.md](references/terms.md)。

> Reference-image retrieval for AI image / video generation — pose mannequins, depth maps, costumes and faces, fetched one at a time by id and fed straight into GPT Image, Nano Banana, ComfyUI or H3.

把 AI 参考图库接进生图 / 生视频流程：按 id 取单张姿势白模、depth、服装、人脸参考图，直接喂给下游生成工具。

![demo](assets/demo.jpg)

同一角色的四个姿势，姿势参考取自 `pose` 库（P015 / P001 / P061 / P007），由 GPT Image 生成。

## 安装

零依赖，Node 18+ 即可，无需 npm install。把目录放到技能目录下：

```bash
git clone https://github.com/klarkxy/ai-gallery.git ~/.agents/skills/ai-gallery
```

## 用法

```bash
node scripts/ref.mjs search pose 座り --angle diag   # 检索元数据，索引缓存 24h
node scripts/ref.mjs cats pose                       # 列出体系 / 分类原文
node scripts/ref.mjs get pose full_single_P015_diag --out ./refs
```

检索词用源站原文：`pose` / `depth` / `face` 是日文，`costume` 是英文，`shisei` 中英日都有。脚本只做字面子串匹配，不做翻译——中文需求由调用方自己转成原文再传进去。

## 库

| 库 | 内容 | 检索词 | 条款 |
|---|---|---|---|
| `pose` | 姿势线稿白模，5 视角 | 日文 | 单张可商用，禁止批量与再分发 |
| `depth` | 同姿势深度图 | 日文 | 同上 |
| `costume` | 无人物服装图 | 英文 | 同上 |
| `face` | 人脸 / 造型 | 日文 | CC0 |
| `shisei` | CC0 姿势库 | 中英日 | CC0，可批量入库 |

条款原文与出处见 [references/terms.md](references/terms.md)。

## 说明

- 一次生成通常 1 张姿势 + 1 张服装 + 1 张脸；按 id 顺序取图，间隔 1.5 秒，每张记进 `<out>/_refs.jsonl`（库、id、源 URL、时间）。
- 受限库按单张取用；要成批拿图、入库或随成品分发，改用 `shisei`。
- `refs/` 与 `work/` 已在 `.gitignore` 中，参考图只作本地输入，不进仓库、不随成品分发。

## 授权

代码与文档采用 [SATA 2.1](LICENSE)。各图库图片的授权另见 `references/terms.md`。
