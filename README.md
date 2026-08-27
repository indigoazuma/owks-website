# OWKS Website

OWKS Webサイトは、Eleventy（11ty）で共通パーツを管理し、GitHub Pagesで配信できる静的HTMLを生成します。

## 編集する場所

- `src/*.njk`: 各ページ固有の本文とページ設定
- `src/_includes/layouts/base.njk`: 全ページ共通のHTML構造
- `src/_includes/partials/`: head、ヘッダー、共通CTA、フッター
- `styles.css`: サイト全体のスタイル
- `main.js`: モバイルメニュー、FAQ、お問い合わせフォーム
- `images/`: 画像素材

ルート直下の既存HTMLは移行前の参照用です。ビルドには使用されません。

## 開発

```sh
pnpm install
pnpm run dev
```

開発サーバーのURLは、起動時に表示されます。

## ビルド

```sh
pnpm run build
```

本番サーバーへ配置できるHTML、CSS、JavaScript、画像、お問い合わせAPIが`dist/`へ出力されます。

## お問い合わせフォーム

フォームの公開処理は`api/contact.php`、設定見本は`config/contact.example.php`です。
SMTP認証情報はGit管理対象外の`config/contact.local.php`、または本番公開ディレクトリの一つ上に置く`owks-private/contact.php`へ設定します。

1. `config/contact.example.php`をコピーして設定ファイルを作成します。
2. SMTP情報と送信先を入力し、最後に`enabled`を`true`へ変更します。
3. ローカルでは`config/contact.local.php`、本番では`owks-private/contact.php`を使用します。

設定ファイルを公開ディレクトリ内やHTML、JavaScriptへ置かないでください。`config/contact.local.php`と`owks-private/`は`.gitignore`で除外されています。

## 新しいページを追加する

1. `src/`に既存ページを参考にした`.njk`ファイルを作成します。
2. front matterへ`layout`、`permalink`、`title`、`description`、`bodyClass`、`currentPage`を設定します。
3. ナビゲーションへページを追加する場合は、`src/_includes/partials/header.njk`と`footer.njk`を1回ずつ更新します。
4. 共通CTAが必要なページだけ`commonCta: true`と、サブボタンのリンク・文言を設定します。
5. `pnpm run build`で`dist/`を再生成します。

`contact`ページのように`commonCta`を設定しないページでは、共通CTAは出力されません。
