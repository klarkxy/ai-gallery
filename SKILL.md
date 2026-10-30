---
name: ai-gallery
description: |
  Fetch pose, depth, costume and face reference images from AI reference galleries for GPT Image,
  Nano Banana, ComfyUI, H3 and other generation tools. Libraries: ギア POSE-DB-01 (pose mannequins),
  POSE-DB-02 (depth), COSTUME-DB-01 (costumes), あぎ face DB, CC0 pose library shisei.
  Use for ai-pose-gallery / ai-costume-gallery / ai-portrait-gallery / shisei requests:
  "sitting pose reference", "winter outfit reference", "side-view pose mannequin",
  "face reference for character consistency". 中文触发：姿势参考图 / 服装参考图 / 人脸参考 /
  姿势白模 / 换姿势保角色。Not for prompt-only requests, or real-person photo and stock image libraries.
---

# AI 参考图库

`scripts/ref.mjs` 是唯一入口，零依赖，Node 18+。

检索词用**源站原文**：pose / depth / face 日文，costume 英文，shisei 中英日都有。脚本做字面子串匹配。

## 选库

| 需求 | 库 | 检索词 |
|---|---|---|
| 姿势线稿白模（5 视角） | `pose` | 日文「分類」「ポーズ名」 |
| 同姿势深度图（ControlNet depth） | `depth` | 日文，同 pose |
| 无人物服装图 | `costume` | 英文单品词（denim、lace、coat、sneakers…） |
| 人脸 / 造型 | `face` | 日文发型词（ショート/ロング…）或 styling |
| 要批量、入库、随成品分发 | `shisei` | 中英日皆可，中文最省事 |

## 用法

```bash
node <skill>/scripts/ref.mjs search pose 座り --angle diag   # 只拉索引元数据，缓存 24h
node <skill>/scripts/ref.mjs cats pose                       # 列出体系/分类原文
node <skill>/scripts/ref.mjs get pose <id> --out ./refs      # 按 id 取图
```

- 多词是「且」，命中太多就加词收窄。
- 分类名拿不准就先 `cats`，把看到的原文原样粘回 `search`——比自己猜译法可靠。
- 直译常对不上：跪坐是「女の子座り」，正坐是「正座」，直身跪立才是「膝立ち」，趴是「四つん這い」。这类错位先查再说。
- 选项：`--angle front|high|low|side|diag`（也认 `正面/上から/下から/横/斜め`）、`--group 体系`（同样用原文）、`--limit N`、`--refresh`、`--small`。
- 想凭眼缘挑图：把输出里的浏览链接给用户，在源站选好再回报 id。

## 取图

- 一次生成通常 1 张姿势 + 1 张服装 + 1 张脸，先定再取；已下载的直接复用。
- 按 id 顺序请求、间隔 1.5 秒；每张记进 `<out>/_refs.jsonl`（库、id、源 URL、时间）。
- `pose`/`depth`/`costume` 的源站条款是单张作参考，要成批拿图走 `shisei`；条款原文见 `references/terms.md`。
- `refs/` 加进 `.gitignore`，交付物只放生成结果。

## 喂图与风格

- 三张输入图分工不同：角色图定**画风与脸**，姿势图（线稿白模）只定骨架，服装图（产品照）只定版型。
- 线稿和产品照都会把画风往目标之外拉。提示词里显式写死：画风只跟角色图，忽略另外两张的渲染风格，只取其形状。
- 只说 `anime style` 不够。要落到具体特征：细线条、平涂赛璐璐上色、硬边阴影、少渐变少高光、眼睛与脸型跟角色图一致。
- 出图后先和角色图并排比一眼画风再交付；跑偏就重生成，别指望后期调。

## 输出

一句话交代库、id、本地路径。商用或公开发布时补一句「生成结果可商用，参考图本身不随成品分发」。

## 故障

- 0 命中：检索词没对上原文，`cats` 看实际叫法，别反复换同义词硬试。
- `找不到 const D=`：源站改版，看新结构再修 `inlineD()`。
- HTTP 403/429：被限速，停一会儿再取，别连刷。
- id 查不到：`--refresh` 重拉索引；仍没有就是已下架。
