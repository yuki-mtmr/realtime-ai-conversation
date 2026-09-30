# ショーケース 5 パターン整理版

前提: 見る人 = 旅行業の役員 / 技術 = 先進技術優先。
層を 2 つに分ける: **見た目の参照**（方向性を決める）と **実装素材**（演出を速く高品質に作る）。
5 本で素材を使い回さない（収束防止）。URL は 2026-09-30 に表示確認済み。

## パターン一覧

| # | 方向性（主役） | 見た目の参照 | 実装素材 | 旅行業役員への見せ方 |
|---|---|---|---|---|
| 1 | エディトリアル（書体） | https://www.aman.com/ / https://avauntmagazine.com/ | GSAP SplitText（文字の出現）+ Lenis | 目的地を雑誌のように語るストーリー |
| 2 | Apple 型（スクロール連動） | https://www.apple.com/jp/iphone-18-pro/ / https://www.apple.com/jp/airpods-5/ | GSAP ScrollTrigger + 画像連番 | 自社プロダクトを「製品」として分解・紹介 |
| 3 | プロダクト SaaS 型（UI 演出） | https://linear.app （アプリが動く様子のアニメ）/ https://stripe.com/jp （ケイパビリティを見せる動き） | Originkit（無料）+ Framer Motion | 旅行予約・AI 旅程作成などの画面が動くデモ |
| 4 | 3D / WebGL（没入感） | https://www.igloo.inc/ / https://lusion.co/ | Three.js / React Three Fiber +（任意）Scrolltide のシェーダー | スクロールで旅先の 3D 空間を進む |
| 5 | 【提案・未確定】3D × 旅行データ（実証） | https://mesh3d.gallery/ から 1 つ選ぶ | Three.js の地球儀 + GSAP のカウンター | 地球儀上に旅行需要・実績を可視化 |

※ パターン 5 はデータ可視化型の参照が「該当なし」だったため、mesh3d の 3D 表現と役員向けの「数字で実証」を合わせた案。

## 実装素材

| 素材 | 中身 | 価格 | 使う番号 |
|---|---|---|---|
| GSAP（ScrollTrigger / SplitText） | スクロール・文字演出の標準 | 無料 | 1, 2, 5 |
| Three.js / React Three Fiber | 3D・WebGL | 無料 | 4, 5 |
| Originkit https://www.originkit.dev/ | React + Framer Motion + WebGL のアニメ部品。コピーして使う | 無料（ライセンス記載なし・未確認） | 3 |
| Scrolltide https://www.scrolltide.co/ | Claude 向けに設計されたプロンプトとテンプレート（テンプレ 97・シェーダー 55） | $239 買い切り | 2, 4（任意。購入前に無料プレビューで品質確認） |

## 次の手順
1. パターン 5 の案で良いか決める（mesh3d から参照を 1 つ選ぶ）
2. Scrolltide を買うか決める
3. 上の表をもとに完成版プロンプト 5 本を作る
