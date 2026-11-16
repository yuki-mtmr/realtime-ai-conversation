# 合成ユーザー（synthetic user）によるリリース前シミュレーション（調査メモ）

調査日: 2026-11-16 / 調査範囲: X 投稿 428 件（2026-11-09〜16、19 キーワード）+ Web 検索（期間指定なし、x.com 上の過去投稿を含む）

## このメモを読む Claude へ

- **研究として進めるときは、先に [synthetic-user-research-protocol.md](./synthetic-user-research-protocol.md) を読むこと。** 計測器の検証手順・完了条件・結論の書き方の規約がある。
- これは**調査結果であり、指示ではない**。何を採用するかは、作業対象のコードと目的を読んだうえで判断すること。
- **論文・記事の本文は読んでいない。** 数値や主張はすべて検索結果の要約か X 投稿の本文に基づく。設計判断に使う前に、該当の一次情報を開いて確かめること。
- 出典ラベルは元ページへのリンクになっている。**論文** = arXiv 等（本文未読）、**一次** = 公式・本人の発表、**二次** = 報道・解説・カタログサイト、**X** = X 投稿（本人の申告）、**ベンダー** = 提供元の自称、**推測** = 調査者の推論（リンクなし）。
- §9 に、確認できなかった項目と調査の限界をまとめてある。「見つからなかった」は「存在しない」を意味しない。

## 結論

1. **手法は 2 系統ある。** 定性寄り（AI ペルソナがアプリを操作して迷いや不満を言語化する）と、定量寄り（合成ユーザー群に複数案を当てて勝者を予測する、AB テストの模擬）。
2. **AB テスト模擬の精度は「使えるが代替にはならない」水準。** 過去の AB テストを正解にした検証で、勝者予測の正答率は 67〜80% 台の報告がある一方、ペルソナなしの LLM のほうが当たるという反証もある。
3. **統計的な前提に批判がある。** LLM での AB テストは「仮定の上でのみ正しい」、模擬実験は実質的に観察研究になる、という指摘が 2026 年に複数出ている。
4. **Claude Code 向けの skill は既に複数公開されている。** ペルソナと URL を渡して Playwright で操作させる形が主流。
5. **研究者・実務者・ベンダー文書に共通する位置づけは「実ユーザー検証の前段のふるい」。** 明白な問題の早期発見と、試す案の絞り込みに使い、最終判断は実ユーザーで行う。

## 1. AB テストの模擬（定量寄り）

- **AgentA/B**（Northeastern・Penn State・Amazon、初版 2025-04、v4 2026-03、CHI EA '26）: ペルソナ付き LLM エージェントが実サイトを操作する。Amazon.com で 1,000 体の被験者間テストを模擬し、実ユーザーの行動と比較。著者は人間のテストの補完と位置づけている。[論文 ↗](https://arxiv.org/abs/2504.09723) / [X ↗](https://x.com/omarsar0/status/1914672295723082014)
  - 紹介投稿によると、実ユーザー 100 万人と比べてセッションは短いが、購入率は近い。[X ↗](https://x.com/omarsar0/status/1914672295723082014)
- **SimAB**（ETH Zurich・Adobe Research、2026-03）: デザイン案とテスト仕様からペルソナを生成し、エージェントの判定を集計する。過去の AB テスト 47 件で正答率 67%、高確信のケースで 80% 超。ペルソナを 1 種類に固定すると正答率が 10 ポイント下がる。[論文 ↗](https://arxiv.org/abs/2603.01024)
  - 高確信ケースの数値は資料によって 75%・83%・80% 超と表記が揺れる。本文で確認が必要。
  - 批評: 予測しているのは勝者であって効果量ではない。一括生成したペルソナは互いに独立でないため「有意」という表現は不適切、という指摘がある。[二次 ↗](https://il.linkedin.com/in/olga-karp)
- **Data-Driven Persona-Conditioned Agents for A/B Test Simulation**（Amazon、2026-09）: 実際の行動データからペルソナを作る。ペルソナの元データが対象ドメインに合っているかが品質を左右する。[論文 ↗](https://arxiv.org/pdf/2609.01038)
  - 紹介投稿によると、案同士を直接比較させる方式で正答率 0.75（CTR）・0.80（購読）、案を個別に採点させる方式では 0.40 前後。[X ↗](https://x.com/cv_usk/status/2097625183909793984)
- **SimGym**（2026-02）: 実トラフィックのセッションログをブラウザエージェントで再生する、EC 向けのオフライン AB テスト。詳細なセッションログが必要。[論文 ↗](https://arxiv.org/pdf/2602.01443)
- **Augmented Hypothesis Testing with Persona-Based LLM Simulations**（2026-09）: AB テストを置き換えるのではなく、LLM の予測を使って必要な人間のサンプル数を減らす。[論文 ↗](https://arxiv.org/pdf/2609.24629)
- **Beyond Offline A/B Testing**（2026-04）: 推薦システム評価のためのエージェントシミュレーション。[論文 ↗](https://arxiv.org/pdf/2604.09549)

## 2. ユーザビリティ検証の模擬（定性寄り）

- **UXAgent**（Northeastern・Amazon、2025-02 / 2025-04）: ペルソナ生成器で多数の模擬ユーザーを作り、ブラウザ経由で対象サイトを操作させる。研究者は行動ログの動画再生と、エージェントへのインタビューで結果を見る。UX リサーチャー 5 名の評価では、発想は評価されたが懸念も出た。[論文 ↗](https://arxiv.org/pdf/2504.09407) / [初版 ↗](https://arxiv.org/pdf/2502.12561)
- **PerceptUI**（2026-06）: UI/UX 評価のための、人間に整合した合成ユーザー。[論文 ↗](https://arxiv.org/pdf/2606.05697)
- **Avenir-UX**（2026-04）: GUI グラウンディングを使った模擬操作による UX 自動評価。[論文 ↗](https://arxiv.org/pdf/2604.09581)
- **UXBench**（2026-06）: LLM が出す UX 批評が、実際に手を打てる内容かを測るベンチマーク。[論文 ↗](https://arxiv.org/pdf/2606.16262)
- **UXCascade**: 「Scalable usability testing with simulated user agents」。PerceptUI の参考文献に題名だけ確認。詳細不明。
- **PersonaCite**（2026-01）: 顧客の声（VoC）に根拠づけた、出典を検証できるインタビュー可能なペルソナ。[論文 ↗](https://arxiv.org/pdf/2601.22288)
- **Can LLM Agents Simulate Customers…?**（2025-09）: LLM エージェントが顧客役になって、買い物アシスタントを評価できるかを検証。[論文 ↗](https://arxiv.org/pdf/2509.21501)

## 3. 妥当性への批判と反証

### 予測精度

- **ペルソナなしが勝つ**（2026-09）: Upworthy の見出し AB テストを正解に使った検証で、ペルソナなしの LLM のほうがペルソナ群より案の順位づけが良かった（Kendall τ = 0.361、首位的中 49.2%）。そもそも大半の AB テストは勝者が統計的に区別できず、信頼できる部分集合（399 件）でしか妥当性を測れない。[論文 ↗](https://arxiv.org/pdf/2609.25010)
- **相関だけでは妥当性を示せない**（2025-12）: ペルソナの採点と人間の AB テスト結果の相関は、それだけではベンチマークの妥当性の根拠にならない。[論文 ↗](https://arxiv.org/pdf/2512.21080v2)
- **模擬ユーザーは現実より都合が良い**: τ-Voice（Sierra・Princeton、ICML 2026）は、自分たちの模擬ユーザーが実ユーザーより忍耐強く記憶も良いと認めている、という紹介がある。[X ↗](https://x.com/AyushiTomar147/status/2120531192407830976)
- **エージェントの操作成功率**: 実サイトの複製上でのエージェントの成功率は 41% というベンチマークがある、との紹介。元の論文は未特定。[X ↗](https://x.com/UbaldoHervas/status/2026281963389063648)

### 統計的な前提

- **Statistical Foundations of LLM-based A/B Testing: A Surrogacy Framework**（2026-06）: LLM の結果を人間の結果の代理指標として扱う枠組み。人間での AB テストは設計によって正しいが、LLM での AB テストは仮定の上でのみ正しい。代理としての妥当性は、過去の施策については反証できるが、新しい施策については検証できない。[論文 ↗](https://arxiv.org/abs/2606.17165)
- **The Illusion of Intervention**（2026-05）: 同じペルソナで初期化した 2 体の合成ユーザーが、計測時点までに別のユーザーになってしまう（ドリフト）。その結果、選択バイアスが生じ、ランダム化実験のつもりが観察研究になる。[論文 ↗](https://arxiv.org/pdf/2605.20767)
- **Synthetic Users, Real Differences**（2026-05）: 複数ターンの会話におけるユーザーシミュレーションの評価枠組み。[論文 ↗](https://arxiv.org/pdf/2605.02624)

### 調査・リサーチ全般

- Nielsen Norman Group: 合成ユーザーや AI の所見は仮説であって事実ではない。[X ↗](https://x.com/NNgroup/status/1809355096368566713)
- NN/g の比較では、合成ユーザーは同調的で浅い、との引用がある。[二次 ↗](https://growth-designers.beehiiv.com/p/diy-synthetic-user-testing-and-the-case-against-it-part-2-of-2)
- Userbrain の自社実験: 合成ユーザーの結果は、実ユーザーと照合して初めて信頼できる。[二次 ↗](https://userbrain.com/blog/synthetic-users-experiment/)
- Ubaldo Hervás「The Illusion of Synthetic Users」: LLM はユーザーとして行動するのではなく、行動についての文章を予測している。模擬回答には社会的望ましさバイアスが残る。[X ↗](https://x.com/UbaldoHervas/status/2026281963389063648)
- 世論・態度調査では、モデルは偏りが強く分散が小さい（machine bias）ため、人間の回答者の代わりにならない、という研究の紹介。[X ↗](https://x.com/arnaudmercier/status/2077217402333397269)
- *Doing Valid Social Science with Large Language Models*（Argyle・Busby・Gubler 編、2027 年刊行予定）に、silicon sampling の人間との整合性検証を扱う章が入る。[X ↗](https://x.com/aaiashn/status/2120488195062370398)
- Synthetic TLX（2026-09）: エージェントシミュレーションは人間の参加者の完全な代替にはまだならない。どの調査が自動化できるかを決める「合成評価の科学」が必要。[論文 ↗](https://arxiv.org/pdf/2609.12273)
- 国内: AI が出すユーザー心理は「それっぽい」回答になりやすく、人間の矛盾や生々しさを捉えきれない。[二次 ↗](https://webtan.impress.co.jp/e/2026/04/03/52301)（デジタルマーケターズサミット 2026 Winter）

## 4. Claude Code 向け skill の既存実装

カタログサイト経由の情報で、リポジトリ本体は開いていない。スター数や導入数はサイト間で食い違うため載せない。

| skill | 内容 | 出典 |
|---|---|---|
| ncklrs/claude-chrome-user-testing | `/user-test` に URL とペルソナを渡す。Playwright MCP で操作し、行動心理と UX リサーチ手法を組み合わせる | [二次 ↗](https://skills.sh/ncklrs/claude-chrome-user-testing/user-testing) |
| owl-listener/designpowers の synthetic-user-testing | 実テスト前に模擬ユーザーで明白な問題を潰す。所見を Critical / Major / Minor に分類し、検証レポートのペルソナウォークスルーに渡す | [二次 ↗](https://www.skills.sh/owl-listener/designpowers/synthetic-user-testing) |
| jezweb/claude-skills の ux-audit | 実ユーザーとして稼働中の Web アプリを歩く。認証が要る場合は Chrome MCP、それ以外は Playwright | [二次 ↗](https://claudeskills.info/skills/jezweb/claude-skills/ux-audit/) |
| nova-act-usability 系 | Amazon Nova Act でペルソナ生成、テスト実行、HTML レポート出力まで行う | [二次 ↗](https://claudemarket.ai/skills/zouchaoqun/nova-act-usability) |
| PersonaTwin | ブラウザを使わず、5P フレームワークで作った合成ユーザーからフィードバックを得る | [二次 ↗](https://claudskills.com/skills/personatwin/) |
| thewatcher01/skills の pwa-user-simulation | PWA のユーザーシミュレーション（詳細未確認） | [二次 ↗](https://skills.sh/thewatcher01/skills/pwa-user-simulation) |

関連する実践:

- 1 つの skill に対して、役割・前提知識・技術力の異なる模擬ユーザー約 10 人を当て、混乱した箇所と結果のばらつきを見る。[X ↗](https://x.com/theneurondaily/article/2085744879439958107)
- Claude Code の QA で、架空ユーザー 4 人を並列に走らせ、テーマ・言語・文字サイズの 12 通りで 144 回実行。サインインは毎回画面を通さず、セッションをテスト DB に直接書いて省略した（到達時間 12 秒 → 4 秒）。[X ↗](https://x.com/paulosteinberg1/status/2121262272416813541)
- AB テストの設計（仮説・サンプルサイズ計算）を行う skill もある。これは実ユーザーでの実験設計用で、模擬ではない。[X ↗](https://x.com/coreyhainesco/status/2032584249464033629)

## 5. 商用ツール

機能説明は提供元の自称で、独立した精度評価は見つかっていない。

| ツール | 位置づけ | 出典 |
|---|---|---|
| Synthetic Users | 合成参加者によるインタビュー・調査。URL やスクリーンショットに対するタスク型 UX セッションにも対応 | [二次 ↗](https://aimultiple.com/synthetic-users) / [X ↗](https://x.com/chunonline/status/2021285614885405167) |
| Versive | AI ペルソナが、公開されている稼働中のサイトを実ブラウザで操作する。ログインや VPN の壁は越えられない | [ベンダー ↗](https://docs.getversive.com/ai-tests/website-tests) |
| Noemica | 対象層に合わせたペルソナを設計し、実ブラウザで稼働中の製品に当てる | [二次 ↗](https://f4.fund/startups/noemica) |
| Uxia | 合成ユーザーで UX/UI フローを検証 | [二次 ↗](https://slashdot.org/software/synthetic-user-tools/) |
| Stravito AI Persona Builder | 自社の調査資料からペルソナを作り、特性ごとに根拠の出典を示す。サイト操作はしない | [ベンダー ↗](https://www.stravito.com/ai-persona-builder) |
| Sprig | リリース前のガイド検証向けに合成参加者を提供 | [二次 ↗](https://getversive.com/help/best-ai-user-research-tools) |
| Synthetic Society | 合成ユーザーで、実ユーザーより先にバグや UX の問題を見つける | [二次 ↗](https://www.g2.com/products/synthetic-society/reviews) |
| Delve AI / atypica.AI | AI 参加者によるデザイン・サイトのテスト / 消費者シミュレーション | [X ↗](https://x.com/DelveAi) / [X ↗](https://x.com/atypica_ai) |
| Aaru / Simile | 大規模なオーディエンス模擬。企業向けの営業主導型 | [二次 ↗](https://getversive.com/help/best-ai-user-research-tools) |

- Versive の文書自身が「AI ペルソナは一貫しているが、生活の文脈を持つ顧客ではない。実際の人が払うか、行動するかは確かめられない」と書いている。[ベンダー ↗](https://getversive.com/help/website-usability-testing)
- 「適切に構築すれば人間の回答と 90% 以上相関する」という数値はベンダーの宣伝で、独立した裏づけは見つかっていない。[二次 ↗](https://jisaku.com/glossary/synthetic-persona-application)
- Coca-Cola のインサイト担当者は、合成ペルソナは実テストの前に多数の案を絞る初期段階で最も役立つと述べている。[二次 ↗](https://www.marketscale.com/industries/pro-av/how-ai-is-reshaping-consumer-insights-and-marketing-research)

## 6. 隣接領域: AI エージェントを模擬ユーザーでテストする

対象はアプリではなく AI エージェントだが、模擬世界とペルソナの作り方が参考になる。

- **Plurai Simulation**（2026-11-11 一般提供、シード $13M、Team8 主導）: エージェントのコード・ツール・知識ベースから、状態を持つ模擬世界（デジタルツイン）を作る。台本から外れるペルソナを当て、会話ではなく実際に起きた状態変化を評価する。本番の失敗を回帰テストとして再生できる。Claude Code などのコーディングエージェント内のプラグインとして動く。[一次 ↗](https://www.prnewswire.com/il/news-releases/plurai-raises-13m-to-build-the-simulation-infrastructure-for-trustworthy-self-improving-ai-agents-302936422.html) / [X ↗](https://x.com/0xpipimd/status/2121249222909452348) / [X ↗](https://x.com/iam_chonchol/status/2120591857923027221)
  - 「実ユーザーに届く失敗を 82% 削減」などの成果は同社の自称。
- **Google ADK のユーザーシミュレーション**: エージェント評価用に、混乱したユーザーや要求の多いユーザーなどを模擬する。[一次 ↗](https://developers.googleblog.com/en/announcing-user-simulation-in-adk-evaluation/)
- **Lyzr Agent Studio**: 公開前に模擬ユーザーとレッドチーム攻撃を当てる。[X ↗](https://x.com/lyzr__ai/status/2121561854170599773)
- **τ-Voice**（Sierra・Princeton）: 模擬の通話者が、訛り・雑音・割り込みを交えて音声エージェントと話す。[X ↗](https://x.com/AyushiTomar147/status/2120531192407830976)

## 7. 実行基盤（エージェントにアプリを操作させる層）

- **Web**: Playwright MCP が事実上の標準。Playwright v1.56 で Planner・Generator・Healer の 3 エージェントが追加された。[X ↗](https://x.com/sergeykarayev/status/1949883217773052132) / [X ↗](https://x.com/akira_papa_IT/status/1975619416911192294)
- **モバイル**: Expo Simulators（クラウド上の iOS/Android シミュレータをエージェントが操作し、録画を PR に添付）。[X ↗](https://x.com/stretchcloud/status/2121222798890996020)
- **モバイル実機**: 実機 Android を操作する MCP、mobile-mcp（Appium・ADB への変換）、BrowserStack の MCP ゲートウェイ。エミュレータはセンサーやネットワークの挙動を再現しきれない、という指摘つき。[X ↗](https://x.com/stretchcloud/status/2119789605608165444)
- **QA エージェント**: Replay QA（PR ごとに自律テストを走らせ、実行時の証拠つきでバグを報告）、Operio（アプリの用語・フロー・業務ロジックを知識ベースとして教える）。[X ↗](https://x.com/replayio/status/2120931379890561389) / [X ↗](https://x.com/OperioAI/status/2121953096385310928)
- AI による UI テストは結果が安定せず誤検出や見落としがあり、コストも高い、という指摘もある。[X ↗](https://x.com/dotey/status/1860789073331286021)

## 8. 実務者の所感と方法論（X、2026-11-09〜16）

- Playwright とペルソナ定義でのユーザビリティ検証は、人手の代替にはならないが、シフトレフトの用途では十分実用的。[X ↗](https://x.com/Chise_QA/status/2120215192126857400)
- 「合成ユーザーとは、自社の顧客調査から作った AI ペルソナ。実ブラウザで稼働中のサイトを開き、何かを達成しようとして、迷いや不安を声に出す」。[X ↗](https://x.com/EliasVeris/status/2120258970954973557)（スレッドの 2 投稿目のみ取得。製品名は不明）
- Suzanne Mouton（Design Matters 26）: 既存の実ユーザー調査に根拠づけた合成ペルソナで、新しい問いを探る。目的は「確信するため」ではなく「決めるのに十分な調査」。[X ↗](https://x.com/yukio_andoh/status/2121854067207278790)
- Greg Isenberg の方法として紹介されたもの: 通話 50 本から合成ユーザーを作り、30 日間「明日も使うか」を毎日書かせる。初見の評価と、使い続けたときの評価を分けて測る。[X ↗](https://x.com/axbyalexai/status/2119724254396600799)（[元投稿 ↗](https://x.com/gregisenberg/status/2117665020565688447) は未読）
- 国内の実践例として、開発中の画面を AI ペルソナに操作させて UI の課題を抽出する記事がある。[二次 ↗](https://zenn.dev/yana22/articles/774cd36db27f5d)（本文未読）

## 9. 確認できなかった項目と調査の限界

- **AJX**: 「AI エージェントから見た製品の使いやすさ」を評価する OSS の CLI と skill 一式を公開した、というニュース bot の投稿が 1 件。一次情報は見つからなかった。[X ↗](https://x.com/AgentBreak40737/status/2119926897932972154)
- **X 記事形式の投稿**: API ではリンクしか取れず、本文未読。検索語に一致したもののうち関連がありそうなのは [PostHog ↗](https://x.com/posthog/status/2120593447732257011)、[Google AI Studio ↗](https://x.com/GoogleAIStudio/status/2120976872729174329)、[@xFelixClausen ↗](https://x.com/xFelixClausen/status/2122104214105076159)。内容が本題に関係するかも未確認。
- **X の検索範囲**: API での収集は直近 7 日のみ。それ以前の投稿は、検索エンジンに載ったものしか拾えていない。
- **X 収集の精度**: 428 件のうち本題に関係したのは 20 件弱。残りは暗号資産・株・半導体などの無関係な投稿。
- **日本語圏**: X 上の 6 キーワードで 7 件のみ。国内は Claude Code と Playwright によるテスト自動化の投稿が中心で、合成ユーザーの実践例はほとんど見つからなかった。
- **論文の査読状況**: arXiv のプレプリントが大半で、査読の有無は確認していない。

## 10. 設計に使うときの論点（調査者の推測）

以下は上記の資料から調査者が引いた推論で、どの資料にもそのままは書かれていない。

- 合成ユーザーの出力は、実ユーザー検証にかける案を絞るための事前情報として扱い、単独で出荷判断に使わない。推測
- 定量予測をさせるなら、案を個別に採点させるより、案同士を直接比較させるほうが当たりやすい可能性がある（§1 の Amazon 論文の紹介に基づく）。推測
- ペルソナを付けることが精度を上げるとは限らない。ペルソナなしの条件を必ず比較対象に入れる。推測
- 自前の仕組みの妥当性は、結果が既に分かっている過去の施策で検証する。ただし、それは新しい施策での正しさを保証しない（§3 の Surrogacy Framework）。推測
- ペルソナは実データ（顧客調査、行動ログ、通話記録）に根拠づけ、対象ドメインに合ったデータを使う。推測
