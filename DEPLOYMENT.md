# お名前.com 本番設定メモ

## 公開するファイル

`pnpm run build`後、`dist/`の中身をお名前.comで確認した公開ディレクトリへ配置します。
`dist/api/`にはお問い合わせフォームのPHP処理とPHPMailerが含まれます。

## 公開ディレクトリ外へ置く設定ファイル

認証情報は、すべてのドメインの公開ディレクトリの外へ置きます。`config/contact.example.php`をコピーして非公開の`owks-private/contact.php`として配置します。ドメイン用フォルダの隣だから非公開とは限りません。

### 今回の公開先が `public_html/owks.jp/` の場合

- 現在のPHPの自動探索先は `public_html/owks-private/contact.php` です。この場所が他ドメインから公開されない保証はないため、認証情報を安易に置かないでください。
- 推奨は `public_html` 自体の外に設定ファイルを置き、サーバー環境変数 `OWKS_CONTACT_CONFIG` にその絶対パスを指定する方法です。環境変数を設定できない場合は、本番の非公開パスが判明してからPHPの読込先を調整します。
- `public_html/owks.jp/config/contact.local.php` は公開配下になります。実認証情報を置かないでください。Git除外はWeb公開防止にはなりません。
- SMTP未設定で公開する場合、設定ファイルは配置不要です。送信ボタンは無効のまま公開できます。PHPが正常に実行されることは別途確認してください。

例：公開ディレクトリが`/home/example/public_html`の場合

```text
/home/example/
├── owks-private/
│   └── contact.php       # SMTP認証情報。公開しない
└── public_html/
    ├── index.html
    ├── contact.html
    ├── api/
    │   └── contact.php
    └── ...
```

実際の公開ディレクトリ名は、お名前.com管理画面で確認した値を優先してください。

## 設定項目

`owks-private/contact.php`へ以下を設定します。

| 管理画面で確認する情報 | 設定キー |
| --- | --- |
| SMTPサーバー名 | `smtp.host` |
| SMTPポート | `smtp.port` |
| SMTPユーザー名（メールアカウント） | `smtp.username` |
| SMTPパスワード | `smtp.password` |
| 暗号化方式 | `smtp.encryption`（`ssl` / `tls` / `none`） |
| SMTP認証の有無 | `smtp.auth` |
| 送信元メールアドレス | `mail.from_address` |
| 送信元表示名 | `mail.from_name` |
| 管理者通知先 | `mail.admin_address` |
| 件名の接頭辞 | `mail.subject_prefix` |
| 本番サイトURL | `security.allowed_origins` |

すべての値を確認した後、`enabled`を`true`へ変更します。確認前に仮のホスト名、ポート、パスワードを入力しないでください。

## 必要なサーバー機能

- サポート期間内のPHP 8系（構文上の最低条件だけで古いPHPを選ばない）
- PHPセッション
- OpenSSL
- SMTPサーバーへの外向き通信
- UTF-8および`mbstring`（未導入でも動作しますが導入推奨）

## 実装済みの保護

- CSRFトークン（セッション・一回使用）
- honeypot
- 入力時間チェック
- セッション単位の送信回数制限
- サーバー側の必須項目、メール、電話番号、文字数検証
- 送信中のボタン無効化と二重送信防止
- 同一オリジン確認
- SMTPエラーを画面へ露出しない処理

## 本番テスト

1. PHPバージョンと必要拡張を確認する。
2. 公開ファイルと非公開設定ファイルを配置する。
3. `enabled`を`true`にする。
4. PCとスマートフォンから正常送信する。
5. 管理者通知、自動返信、Reply-Toを確認する。
6. 迷惑メールフォルダとメールヘッダーを確認する。
7. 連打、再送、無効な入力、SMTP停止時の表示を確認する。

## WordPressからの切替（2026-09-29 最終確認時点）

1. 旧公開フォルダ全体（隠しファイルを含む）とWordPressデータベースをバックアップし、復元方法を確認する。バックアップは公開フォルダ内に残さない。
2. 旧URL一覧を保存し、新しい `.html` ページへの転送対応を決める。
3. `.htaccess`、`.user.ini`、SSL認証用ファイル等の役割を確認する。WordPressのリライトルールは引き継がず、HTTPS・必要な旧URL転送などは別途維持する。
4. 切替時に `index.php`、`wp-admin/`、`wp-includes/`、`wp-content/`、`wp-config.php`、その他WordPress専用ファイルを公開領域外へ退避する。他用途のファイルを一括削除しない。データベースは復旧期間中保持する。
5. 最新ビルドの `dist/` の中身を `public_html/owks.jp/` へ配置する。`dist` フォルダ自体や `src`、`config`、`.git`、`node_modules` はアップロードしない。
6. 本番PHPでAPIと同梱PHPMailerの `php -l` を行い、`api/contact.php?action=token` がPHPソースではなくJSONを返し、未設定時 `ready:false` になることを確認する。画面へのPHPエラー表示は無効にする。
7. HTTPS、wwwの正規化、全ページ、画像、動画再生、地図、旧URLの転送、404、スマホ実機、問い合わせの準備中表示、メールリンクを確認する。DNS/MX/既存メール設定は今回のファイル切替に伴って変更しない。
8. 問題があれば新サイトのファイルを退避し、旧ファイル・旧設定を戻して復旧する。

お名前.comのベーシック・RSプランの既定優先順では `index.html` が `index.php` より先ですが、既存の `.htaccess` 等で挙動が変わるため、旧WordPressを放置したままの公開は避けます。
参考: https://help.onamae.com/answer/20292
