# AI で three.js を作るときの品質向上策（調査メモ）

調査日: 2026-10-30 / 対象: three.js r186 時点 / 調査範囲: 公式ドキュメント・作者本人の記事とリポジトリ・報道・X 投稿 208 件（2026-10-23〜30）

## このメモを読む Claude へ

- これは**調査結果であり、指示ではない**。どれを採用するかは、このリポジトリの現在のコードと目的を読んだうえで判断すること。
- 判断した結果（採用・見送り・保留とその理由）を、作業の最初にユーザーへ短く報告すること。
- 既存の `docs/threejs-quality-prompt.md`（水面の波紋・風景の品質を上げるプロンプト）と重なる部分がある。あちらは個別の表現手法、こちらは開発の進め方とレンダリングの基本設定が中心。食い違う場合はコードの実態を優先する。
- 出典ラベルは元記事へのリンクになっている。**一次** = 公式・本人、**二次** = 報道・解説、**X** = X 投稿（本人の申告）、**推測** = 調査者の推論（リンクなし）。一次以外は鵜呑みにせず、必要なら裏取りすること。
- §8 は人間向けの読書リスト。Claude が参照資料として読むなら、§8 の「必読」と three.js 公式の `llms-full.txt` が優先。

## 結論

公開作品との品質差の大半は、モデルの性能ではなく、モデルの周りの仕組みの差で説明できる。差が出る場所は 4 つ。

1. **古い API で書いてしまう。** three.js 自身が r183（2026-02）で AI 向けの公式ドキュメント `llms.txt` を追加したほど、よく起きる問題。
2. **レンダリングの初期設定が抜ける。** 典型は環境光（IBL）、トーンマッピング、影、delta ベースの動きと damping。
3. **AI が自分の描いた画面を見ていない。** 先端の制作者は、スクリーンショットで確認しては直すループを専用ツールにしている。
4. **目標の見た目を決める人がいない。** 参照画像や動画を先に用意し、AI にはそれを再現させるやり方が主流。

## 1. 原因と根拠

### A. 分布収束
- Anthropic はこの現象を distributional convergence と呼ぶ。デザインの指示がなければ、モデルは学習データで最も多い見た目を出す。[一次 ↗](https://claude.com/blog/improving-frontend-design-through-skills)（2025-11-12）
- Opus 5.5 のガイドには「'avoid a generic AI look' のような抽象的な指示は、ある既定の見た目を別の既定に置き換えるだけ」とある。避けたいパターンを具体的に列挙し、出力を見ながらリストを書き足すのが効く。[一次 ↗](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)

### B. API の鮮度
- three.js の公式 issue #31933（2025-09-24）は「LLM は three.js が得意ではない」という報告から始まり、PR #32673 を経て r183（2026-02-18）で `llms.txt` と `llms-full.txt`（約 363KB、TSL を含む）が追加された。[issue ↗](https://github.com/mrdoob/three.js/issues/31933) / [PR ↗](https://github.com/mrdoob/three.js/pull/32673)
- `docs/llms.txt` の LLM 向け指示の中身 [一次 ↗](https://threejs.org/docs/llms.txt):
  - r128 の `three.min.js` を script タグで読む書き方は古い。import map を使う。
  - 既定は WebGLRenderer。TSL・compute・ノードマテリアルが必要なときだけ WebGPURenderer。
  - WebGPU では GLSL ではなく TSL で書く。
- **品質（ライティングや色）についての指針は llms.txt に含まれていない。**
- TSL は新しい記法で学習データが少ないため、`llms-full.txt` や skill を参照させる前提で使うのが安全。推測

### C. 空間と視覚の推論
- Dave Snider（2026-03-13）は、Claude の空間推論は弱いという前提で、Claude が自分で見た目を確認できるツールを先に作った。「Just because there's a box there, it doesn't mean its visible.」[一次 ↗](https://www.davesnider.com/posts/claude-3d)
- Karpathy の LOTR デモ（Opus 5 で約 2 時間・5,500 行）は、モデルが結果を動画として見られずスクリーンショットだけに頼ったことが誤りの原因とされ、本人は「rough but fun」と評した。[二次 ↗](https://the-decoder.com/unicorn-pelican-middle-earth-openai-co-founder-karpathy-is-looking-for-the-next-ai-vibe-test/)（The Decoder 2026-08-03。元の X 投稿は取得できず）

### D. 最初の出力で止める
- Opus 5.5 で「平面図から入れる 3D 空間」を 7 通り作った作者によると、スタータープロンプトは新しいセッションで 1 回走らせたもの。ただし話題になった完成版には、その後 2 週間・数十回の修正を重ねた。[X ↗](https://x.com/Minsi_AI/status/2115778809895301599)
- Casa Serra（Claude Code + Opus 5.5）は約 70 回のプロンプトで作られた。[一次 ↗](https://github.com/Sam1983Aing/casa-serra)（検索結果の要約で確認）

## 2. 先端のワークフロー（導入する順）

### 1. 正しい API を参照させ、バージョンを固定する
- 公式の [`llms-full.txt`](https://threejs.org/docs/llms-full.txt) を参照させ、API は記憶で書かせない。
- PR #35138（2026-10-21）で、LLM に公式の最小 Vite 構成 `mrdoob/three-starter` から始めさせる案内が追加された。[一次 ↗](https://github.com/mrdoob/three.js/pull/35138) 公開中のドキュメントへの反映とリポジトリの実在は未確認。
- skill パックの候補（いずれも作者自身のリポジトリ。品質を独立に検証した結果は見つかっていない）:
  - [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills): r186 対象、13 skill、★3.8k
  - [dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill): TSL と WebGPU、★1.3k
  - [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills): ゲーム向け。director / QA の役割分離あり、★2.6k

### 2. AI が自分で画面を確認できるようにする
- Claude Code の公式ベストプラクティスは、完成の確認方法として「A browser screenshot next to the mockup」を挙げ、根拠としてスクリーンショットを提出させるよう勧めている。[一次 ↗](https://code.claude.com/docs/en/best-practices) Claude in Chrome にも、モックと実画面を突き合わせる機能がある。[一次 ↗](https://code.claude.com/docs/en/chrome)
- Anthropic の長時間エージェントの記事でも、ブラウザ自動化で動作確認するよう明示すると検証の精度が上がったと報告されている（Puppeteer MCP でスクリーンショットを撮影）。[一次 ↗](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)（2025-11-26）
- Snider の方法 [一次 ↗](https://www.davesnider.com/posts/claude-3d):
  - Playwright で、固定カメラ（プリセット角度・ズーム・ID 指定）から撮るスクリプトを作る。
  - 狙った位置に赤いデバッグ用の球を置かせ、スクリーンショットと照合させる。
- Playwright MCP は通常アクセシビリティツリーで画面を読むので、`<canvas>` の中は見えない。3D ではスクリーンショットが必須。推測
- まず機械的に判定できる証拠（画素の差分、コンソールのエラー、`renderer.info`）を集め、AI の目視判断はその後にする。[二次 ↗](https://argos-ci.com/blog/visual-testing-ai-coding-agents)
- スクリーンショットでの修正ループで費用が 4 倍になった例がある。ループには回数の上限を付ける。[二次 ↗](https://news.ycombinator.com/item?id=47365299)

### 3. 目標の絵を先に作り、AI には再現させる
- Video2Game（2026-10-28、1,309 いいね）の手順 [X ↗](https://x.com/OdinLovis/status/2115526967802110284):
  - まず動画生成 AI でゲーム画面の動画を作る。
  - Claude がそれを three.js で遊べるゲームにする。画像・3D モデル・音はすべて fal で生成。
  - 作者の言葉は「Claude can't design very original little game on his own」。
  - 自動の試遊と比較、31 本、fal の費用約 $202 といった詳細は第三者のまとめによる。リポジトリは確認できていない。[X ↗](https://x.com/BeyondTheBoxCN/status/2115836055928938685)
- OpenAI の GPT-5.4 向けフロントエンドガイドも、参照画像やムードボードを先に渡すことと、Playwright を使わせると仕上がりが大きく良くなることを挙げている。[一次 ↗](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4)
- Claude Design（2026-04-17）は 3D とシェーダーを対象に含み、Claude Code に引き渡す機能がある。three.js に特化した記述はない。[一次 ↗](https://www.anthropic.com/news/claude-design-anthropic-labs)

### 4. 方向を決める工程と、実装する工程を分ける
- Casa Serra のスタータープロンプト: まず建物の構成とカメラの通り道を提案させ、「2〜3 案を出して私の返事を待つ」と指示する。合意してから区切りごとに実装させる。[一次 ↗](https://github.com/Sam1983Aing/casa-serra)
- threejs-game-skills の役割分離: director（品質基準・作業の割り振り・証拠集め）、graphics（基準例で採点を揃えた見た目の評価表）、QA（スクリーンショットと画素の数値で検査）。[一次 ↗](https://github.com/majidmanzarpour/threejs-game-skills)
- OpenAI 公式の Game Studio プラグインにも `game-playtest` と `web-3d-asset-pipeline` がある。[一次 ↗](https://github.com/openai/plugins/tree/main/plugins/game-studio)
- Snider は CSS・デザイン・初期の設計を自分で書き、骨組みができてから大部分を Claude に任せる。[一次 ↗](https://www.davesnider.com/posts/claude-3d)

### 5. アセットはコードと別の流れで作る
- プリミティブだけで組むと見た目の上限が低い。X で評価の高い作品は、Blender か 3D 生成 AI（Meshy、Tripo、Hunyuan3D など）で作ったモデルを glTF で使っている。[X ↗](https://x.com/zavrenn/status/2115517611416879445)
- Blender MCP は Blender 公式ではなく第三者製。[一次 ↗](https://github.com/ahujasid/blender-mcp) うまくいかないという声もある。[X ↗](https://x.com/MaxEllison2048/status/2115835598749520018)
- 最適化は `gltf-transform inspect` で中身を確認してから `optimize` にかける。既定の設定が最適とは限らない。[一次 ↗](https://gltf-transform.dev/cli) 圧縮は Meshopt と KTX2 が主流。[二次 ↗](https://www.utsubo.com/blog/threejs-best-practices-100-tips)

## 3. 品質チェックリスト

| 領域 | やること | AI のよくある誤り | 出典 |
|---|---|---|---|
| 環境光 | `scene.environment` に PMREM で作った HDRI（または RoomEnvironment）を設定し、ライトは補助に回す | Ambient と Directional だけで照らし、金属が黒くなる | [二次](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| トーンマッピング | `toneMapping`（AgX / Neutral / ACES）と `toneMappingExposure` を明示する | NoToneMapping のまま、または ACES に固定して露出を調整しない | [一次](https://threejs.org/docs/#api/en/constants/Renderer) |
| 色空間 | 色のテクスチャ（`map`、`emissiveMap`）だけ `SRGBColorSpace` にする | r152 より前の `encoding` や `sRGBEncoding` を使う | [一次](https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791) |
| 影 | 影を落とす物・受ける物を必要な分だけ指定し、シャドウマップは 1024〜2048 にして bias を調整する | 影がない、または全オブジェクトに影を付けて重くなる | [二次](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| ポストエフェクト（pmndrs 使用時） | renderer 側は NoToneMapping、ToneMappingEffect を最後の段、HalfFloat バッファ、エフェクトは 1 つの EffectPass にまとめる | トーンマッピングを二重にかける、bloom の threshold を 0 にする | [一次](https://pmndrs.github.io/postprocessing/public/docs/) |
| 動き | delta ベースで動かし、damping で追従させる。R3F の useFrame の中で setState しない | `position.x += 0.01` のようなフレーム依存の加算 | [一次](https://r3f.docs.pmnd.rs/advanced/pitfalls) |
| スクロール | Lenis を GSAP の ticker で動かし、ScrollTrigger と同期させる | scroll イベントの中でカメラを直接動かす | [一次](https://github.com/darkroomengineering/lenis) |
| アセット | glTF を Meshopt と KTX2 で圧縮し、`ktx2Loader.detectSupport(renderer)` を必ず呼ぶ | 4096px の PNG をそのまま使う、プリミティブで代用する | [一次](https://gltf-transform.dev/cli) / [二次](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| 負荷 | DPR を `min(devicePixelRatio, 2)` に抑え、draw call はモバイルで約 100 以下。InstancedMesh や BatchedMesh を使い、不要になったら dispose する | メッシュを 1 個ずつ作り、マテリアルを複製する | [二次](https://www.utsubo.com/blog/threejs-best-practices-100-tips) |
| WebGPU | TSL と NodeMaterial で書く。r183 でポストエフェクトのクラスが `PostProcessing` から `RenderPipeline` に改名された | WebGPU で GLSL を書く、旧名を使う | [一次](https://threejs.org/docs/llms.txt) / [二次](https://app.cinevva.com/news/2026-03-18-threejs-r183-render-pipeline)（改名は公式リリースノートと未照合） |

## 4. CLAUDE.md への追記案（採用する場合）

```markdown
## three.js ルール
- three は r186 に固定する。API は記憶で書かず docs/llms-full.txt（公式）を正とする
- 禁止: THREE.Geometry / renderer.outputEncoding / texture.encoding / sRGBEncoding / r128 の script タグ
- 初期化の必須項目:
  - renderer.toneMapping（AgX | Neutral | ACESFilmic）+ toneMappingExposure を明示
  - scene.environment に PMREM 済みの HDRI（無ければ RoomEnvironment）
  - renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
- 色のテクスチャ（map, emissiveMap）のみ colorSpace = SRGBColorSpace
- アニメーションは delta ベース、追従は damp。R3F の useFrame 内で setState しない
- 後処理（pmndrs）: renderer 側は NoToneMapping、ToneMappingEffect を最後、HalfFloat
- アセット: プリミティブで代用しない。gltf-transform inspect → optimize（Meshopt + KTX2）

## 完了条件（毎回）
- 固定カメラ 3 アングルのスクリーンショットを reference/ の画像と並べて提出
- renderer.info.render.calls とコンソールエラー数を報告
- 修正ループは最大 5 周。それ以上は人間に判断を返す

## 避ける見た目（初回出力を見て追記していく）
- 原色のベタ塗りマテリアル / 宙に浮く球体の羅列 / 均等グリッド配置 / 無意味な自動回転
```

r186 の固定とレンダラの選択は、このリポジトリで現在使っているバージョンとレンダラに合わせて調整すること。

## 5. モデルについて

- Design Arena の 3D ランキング（2026-09-14 時点の 1 回分）: GPT-6 Astra 1481、Kimi K3 1426、Claude Fable 5.1 1423。[二次 ↗](https://betterstack.com/community/guides/ai/kimi-claude-astra-design/)（Better Stack）。ランキングのページそのものは読み込めず、Opus 5.5 は含まれていない。
- Opus 5.5 は、スクリーンショットや図を Opus 5 より「considerably more precisely」に読める。[一次 ↗](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) 確認ループとの相性が良い。
- 上位の差は Elo で 60 程度しかない。モデルを替えるより、§2 の仕組みを整えるほうが効果が大きい。推測

## 6. 推奨する進め方（叩き台）

1. **すぐ（30 分）**: three のバージョン固定、`llms-full.txt` の参照、§4 の CLAUDE.md 追記、skill パックを 1 つ導入。
2. **今週（半日）**: Playwright で固定カメラ 3 アングルを撮るスクリプトと、`renderer.info` / コンソールエラーを書き出す処理を作り、完了条件に組み込む。
3. **継続**: 人間が目標の参照画像を 3〜5 枚選んで `reference/` に置き、採点基準を作る。出力のたびに「避ける見た目」を書き足す。

## 7. 未確認事項

- Karpathy の元の X 投稿（HTTP 402 で取得できず）
- Video2Game の詳細（リポジトリが見つからない。数字は第三者のまとめ）
- r183 での `PostProcessing` → `RenderPipeline` 改名（二次情報のみ。公式リリースノートと未照合）
- `mrdoob/three-starter` の実在
- X API の検索は直近 7 日分しか遡れないため、X の情報は 2026-10-23〜30 に偏っている
- リポジトリのスター数は人気の目安であり、品質の証拠ではない

## 8. 読書リスト（人間向け）

リンクは 2026-10-30 に確認済み。**必読** = まず読む（すべて無料）、**推奨** = 必要になったら、**余力** = 深く知りたいとき。

### AI と一緒に作る

| 優先 | タイトル | 種別・著者・日付 | 読む理由 |
|---|---|---|---|
| 必読 | [Claude tips for 3D work](https://www.davesnider.com/posts/claude-3d) | 記事 · Dave Snider · 2026-03-13 | AI で 3D を作る記事で最も具体的。固定カメラの撮影スクリプトとデバッグ用の球の使い方 |
| 必読 | [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | 記事 · Anthropic（Justin Young）· 2025-11-26 | ブラウザ自動化での検証を明示する、進捗は JSON、1 セッション 1 機能 |
| 必読 | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) | 公式ドキュメント · Anthropic | 検証の手段を渡し、スクリーンショットを根拠として出させる |
| 必読 | [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) | 公式ドキュメント · Anthropic | フロントエンド節。避ける見た目を具体的に列挙する書き方 |
| 推奨 | [Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills) | 記事 · Anthropic · 2025-11-12（日本語版あり） | 分布収束と skill による対策。three.js 用 skill を自作するときの手本 |
| 推奨 | [Designing delightful frontends with GPT-5.4](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4) | 記事 · OpenAI | 参照画像・デザイントークン・Playwright。Claude でもそのまま使える |
| 推奨 | [Here's how I use LLMs to help me write code](https://simonwillison.net/2025/Mar/11/using-llms-for-code/) | 記事 · Simon Willison · 2025-03-11 | 調査と本番コードで AI への頼み方を変える |
| 余力 | [Beyond Vibe Coding](https://www.oreilly.com/library/view/beyond-vibe-coding/9798341634749/) | 書籍 · Addy Osmani · O'Reilly 2025 | vibe coding と AI 支援開発の違い、チームでの運用 |

### three.js を正しく書く

| 優先 | タイトル | 種別・著者・日付 | 読む理由 |
|---|---|---|---|
| 必読 | [three.js 公式マニュアル](https://threejs.org/manual/)（AI 向け: [llms-full.txt](https://threejs.org/docs/llms-full.txt)） | 公式ドキュメント | 最新の書き方の基準。人はマニュアル、AI には llms-full.txt |
| 必読 | [Three.js best practices: 100 tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) | 記事 · Utsubo · 2026-09-11 更新（二次） | §3 のチェックリストの元。影の解像度や draw call の目安など具体的な数字 |
| 推奨 | [Three.js Journey](https://threejs-journey.com/)（[WebGPU & TSL コース](https://threejs-journey.com/webgpu-tsl) $45・21 レッスン） | 講座 · Bruno Simon · 有料 | 体系的に学ぶ定番。AI の出力を自分で判断できるようになる |
| 推奨 | [Color management in three.js](https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/) | 記事 · Don McCurdy · 2020-06-17 | 色空間の考え方。API 名は旧（`encoding`）なので `colorSpace` に読み替える |
| 推奨 | [Field Guide to TSL and WebGPU](https://blog.maximeheckel.com/posts/field-guide-to-tsl-and-webgpu/) | 記事 · Maxime Heckel · 2025-10-14 | WebGPU を採用するなら。ガラス・compute・パーティクル・ポストエフェクト |
| 余力 | [WebGPU対応のThree.jsのはじめ方](https://ics.media/entry/250501/) | 記事 · ICS MEDIA · r176 時点・2025-09 更新 · 日本語 | WebGPU 移行の要点を日本語で。細部は公式で確認 |
| 余力 | [React Three Fiber: Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls) | 公式ドキュメント · pmndrs | R3F を使う場合のみ。AI がよく書く重い書き方の一覧 |

### シェーダーと GPU

| 優先 | タイトル | 種別・著者・日付 | 読む理由 |
|---|---|---|---|
| 推奨 | [The Book of Shaders](https://thebookofshaders.com/) | Web 書籍 · Patricio Gonzalez Vivo, Jen Lowe · 無料・日本語訳あり | シェーダー入門。TSL でもノイズや形の考え方は同じ |
| 余力 | [Inigo Quilez — Articles](https://iquilezles.org/articles/) | 記事集 · Inigo Quilez | SDF・ノイズ・色の関数。AI への注文を具体的にできる |
| 余力 | [WebGPU Fundamentals](https://webgpufundamentals.org/) | Web 書籍 · 無料 | WebGPURenderer が中で何をしているかがわかる |

### 光と色（AI に任せられない判断）

| 優先 | タイトル | 種別・著者・日付 | 読む理由 |
|---|---|---|---|
| 推奨 | [Color and Light](https://www.amazon.com/dp/0740797719)（[邦訳『カラー&ライト』](https://cgworld.jp/books/technique/8136.html)） | 書籍 · James Gurney · 2010 | 画家が光と色を言葉にした本。AI に光を指示する語彙になる |
| 推奨 | [LearnOpenGL — PBR Theory](https://learnopengl.com/PBR/Theory) | 記事 · Joey de Vries · 無料 | PBR の仕組み。metalness や roughness が見た目にどう効くか |
| 余力 | [Real-Time Rendering, 4th Edition](https://www.realtimerendering.com/) | 書籍 · Akenine-Möller ほか · 2018 | 定番の教科書。トーンマッピングや影の項目を辞書として引く |

## 出典一覧

### 一次（公式・本人）
- [three.js docs/llms.txt](https://threejs.org/docs/llms.txt) / [llms-full.txt](https://threejs.org/docs/llms-full.txt)
- [three.js issue #31933](https://github.com/mrdoob/three.js/issues/31933)（2025-09-24）
- [three.js PR #32673](https://github.com/mrdoob/three.js/pull/32673)（2026-01-06）
- [three.js PR #35138](https://github.com/mrdoob/three.js/pull/35138)（2026-10-21）
- [three.js releases](https://github.com/mrdoob/three.js/releases)
- [Anthropic: Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills)（2025-11-12）
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)（2025-11-26）
- [Prompting Claude Opus 5.5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5)
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices)
- [Claude in Chrome](https://code.claude.com/docs/en/chrome)
- [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs)（2026-04-17）
- [OpenAI: Designing delightful frontends with GPT-5.4](https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4)
- [OpenAI Game Studio plugin](https://github.com/openai/plugins/tree/main/plugins/game-studio)
- [Dave Snider: Claude tips for 3D work](https://www.davesnider.com/posts/claude-3d)（2026-03-13）
- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) / [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [pmndrs/postprocessing](https://pmndrs.github.io/postprocessing/public/docs/) / [R3F pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [glTF Transform CLI](https://gltf-transform.dev/cli) / [Lenis](https://github.com/darkroomengineering/lenis)
- [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) / [dgreenheck/webgpu-claude-skill](https://github.com/dgreenheck/webgpu-claude-skill) / [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills)
- [Casa Serra](https://github.com/Sam1983Aing/casa-serra)
- [blender-mcp](https://github.com/ahujasid/blender-mcp)
- [three.js forum: r152 の色管理](https://discourse.threejs.org/t/updates-to-color-management-in-three-js-r152/50791)

### 二次（報道・解説）
- [The Decoder: Karpathy LOTR](https://the-decoder.com/unicorn-pelican-middle-earth-openai-co-founder-karpathy-is-looking-for-the-next-ai-vibe-test/)（2026-08-03）
- [Better Stack: Design Arena 3D](https://betterstack.com/community/guides/ai/kimi-claude-astra-design/)（2026-09-14）
- [Utsubo: three.js best practices](https://www.utsubo.com/blog/threejs-best-practices-100-tips)（2026-09-11）
- [Cinevva: r183 RenderPipeline](https://app.cinevva.com/news/2026-03-18-threejs-r183-render-pipeline)（2026-03-18）
- [Argos: visual testing for AI agents](https://argos-ci.com/blog/visual-testing-ai-coding-agents)
- [HN: Snider の記事のスレッド（スクリーンショットのループで費用 4 倍のコメント）](https://news.ycombinator.com/item?id=47365299)
- [LBB: Craft Matters by Active Theory](https://lbbonline.com/news/Craft-Matters-by-Active-Theory)

### X
- [@OdinLovis Video2Game](https://x.com/OdinLovis/status/2115526967802110284)（2026-10-28）
- [@BeyondTheBoxCN Video2Game のまとめ](https://x.com/BeyondTheBoxCN/status/2115836055928938685)（2026-10-29）
- [@Minsi_AI 7 通りの作り方と 2 週間の修正](https://x.com/Minsi_AI/status/2115778809895301599)（2026-10-29）
- [@chris_bgp コンセプトアートを先に作る](https://x.com/chris_bgp/status/2115446211490537532)（2026-10-28）
- [@Bk23544 俯瞰のスクリーンショットで隙間を探させる](https://x.com/Bk23544/status/2115863769146683506)（2026-10-29）
- [@zavrenn Codex + Blender + three.js](https://x.com/zavrenn/status/2115517611416879445)（2026-10-28）
- [@MaxEllison2048 Blender MCP がうまくいかない](https://x.com/MaxEllison2048/status/2115835598749520018)（2026-10-29）
- [@agektmr HTML-in-Canvas（Chrome 157）](https://x.com/agektmr/status/2116029058077364240)（2026-10-30）
- [@nitishkmrk 基礎を固め直す](https://x.com/nitishkmrk/status/2115948839219892371)（2026-10-29）
