# お名前.com 本番設定メモ

## 公開するファイル

`pnpm run build`後、`dist/`の中身をお名前.comで確認した公開ディレクトリへ配置します。
`dist/api/`にはお問い合わせフォームのPHP処理とPHPMailerが含まれます。

## 公開ディレクトリ外へ置く設定ファイル

認証情報は公開ディレクトリへ置きません。`config/contact.example.php`をコピーして、公開ディレクトリと同じ階層の`owks-private/contact.php`として配置します。

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

- PHP 7.4以上（PHP 8系を推奨）
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
