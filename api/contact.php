<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/vendor/phpmailer/src/Exception.php';
require_once __DIR__ . '/vendor/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/vendor/phpmailer/src/SMTP.php';

const MAX_REQUEST_BYTES = 65536;

sendSecurityHeaders();
startContactSession();

$config = loadContactConfig();
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

if ($method === 'GET' && ($_GET['action'] ?? '') === 'token') {
    jsonResponse(['ready' => configIsReady($config), 'token' => issueToken()]);
}

if ($method !== 'POST') {
    jsonResponse(['success' => false, 'message' => '許可されていない操作です。'], 405);
}

if (!configIsReady($config)) {
    jsonResponse(['success' => false, 'message' => '現在、送信機能は準備中です。'], 503);
}

if (!originIsAllowed($config)) {
    jsonResponse(['success' => false, 'message' => '送信元を確認できませんでした。'], 403);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_REQUEST_BYTES) {
    jsonResponse(['success' => false, 'message' => '入力内容が長すぎます。'], 413);
}

if (!inputFieldsAreStrings($_POST, ['csrf_token', 'website', 'company', 'name', 'kana', 'tel', 'email', 'message'])) {
    jsonResponse(['success' => false, 'message' => '入力形式が正しくありません。'], 422);
}

$token = trim((string) ($_POST['csrf_token'] ?? ''));
if (!consumeToken($token, $config)) {
    jsonResponse([
        'success' => false,
        'message' => '送信の有効期限が切れました。ページを再読み込みしてお試しください。',
        'token' => issueToken(),
    ], 403);
}

if (trim((string) ($_POST['website'] ?? '')) !== '') {
    jsonResponse([
        'success' => true,
        'message' => 'お問い合わせを受け付けました。',
        'token' => issueToken(),
    ]);
}

if (rateLimitExceeded($config)) {
    jsonResponse([
        'success' => false,
        'message' => '短時間に複数回の送信が行われました。時間をおいて再度お試しください。',
        'token' => issueToken(),
    ], 429);
}

[$data, $errors] = validateContactInput($_POST);
if ($errors !== []) {
    jsonResponse([
        'success' => false,
        'message' => implode(' ', $errors),
        'token' => issueToken(),
    ], 422);
}

try {
    sendAdminNotification($config, $data);
    $autoReplySent = true;

    try {
        sendAutoReply($config, $data);
    } catch (Throwable $error) {
        $autoReplySent = false;
        error_log('OWKS contact auto-reply failed: ' . $error->getMessage());
    }

    recordSuccessfulSubmission();
    jsonResponse([
        'success' => true,
        'message' => $autoReplySent
            ? 'お問い合わせを受け付けました。ご入力のメールアドレスへ確認メールをお送りしました。'
            : 'お問い合わせを受け付けました。担当者よりご連絡いたします。',
        'token' => issueToken(),
    ]);
} catch (Throwable $error) {
    error_log('OWKS contact mail failed: ' . $error->getMessage());
    jsonResponse([
        'success' => false,
        'message' => '送信できませんでした。時間をおいて再度お試しください。',
        'token' => issueToken(),
    ], 500);
}

function sendSecurityHeaders(): void
{
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, max-age=0');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
}

function startContactSession(): void
{
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name('owks_contact');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function loadContactConfig(): array
{
    $candidates = [];
    $environmentPath = getenv('OWKS_CONTACT_CONFIG');
    if (is_string($environmentPath) && $environmentPath !== '') {
        $candidates[] = $environmentPath;
    }
    $candidates[] = dirname(__DIR__) . '/config/contact.local.php';
    $candidates[] = dirname(__DIR__, 2) . '/owks-private/contact.php';

    foreach ($candidates as $path) {
        if (!is_file($path)) {
            continue;
        }
        $config = require $path;
        return is_array($config) ? $config : [];
    }
    return [];
}

function configIsReady(array $config): bool
{
    $smtp = $config['smtp'] ?? [];
    $mail = $config['mail'] ?? [];
    return ($config['enabled'] ?? false) === true
        && trim((string) ($smtp['host'] ?? '')) !== ''
        && filter_var($smtp['port'] ?? null, FILTER_VALIDATE_INT) !== false
        && trim((string) ($smtp['username'] ?? '')) !== ''
        && trim((string) ($smtp['password'] ?? '')) !== ''
        && in_array((string) ($smtp['encryption'] ?? ''), ['ssl', 'tls', 'none'], true)
        && filter_var($mail['from_address'] ?? '', FILTER_VALIDATE_EMAIL) !== false
        && filter_var($mail['admin_address'] ?? '', FILTER_VALIDATE_EMAIL) !== false;
}

function issueToken(): string
{
    $token = bin2hex(random_bytes(32));
    $_SESSION['contact_token_hash'] = hash('sha256', $token);
    $_SESSION['contact_token_issued_at'] = time();
    return $token;
}

function consumeToken(string $token, array $config): bool
{
    $storedHash = (string) ($_SESSION['contact_token_hash'] ?? '');
    $issuedAt = (int) ($_SESSION['contact_token_issued_at'] ?? 0);
    unset($_SESSION['contact_token_hash'], $_SESSION['contact_token_issued_at']);

    if ($token === '' || $storedHash === '' || !hash_equals($storedHash, hash('sha256', $token))) {
        return false;
    }
    $minimumSeconds = max(0, (int) ($config['security']['minimum_fill_seconds'] ?? 3));
    return $issuedAt > 0 && (time() - $issuedAt) >= $minimumSeconds;
}

function originIsAllowed(array $config): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') {
        return true;
    }
    $allowed = array_values(array_filter(
        $config['security']['allowed_origins'] ?? [],
        static fn ($value): bool => is_string($value) && $value !== ''
    ));
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $allowed[] = $scheme . '://' . (string) ($_SERVER['HTTP_HOST'] ?? '');
    return in_array($origin, $allowed, true);
}

function rateLimitExceeded(array $config): bool
{
    $limit = max(1, (int) ($config['security']['rate_limit_count'] ?? 3));
    $window = max(60, (int) ($config['security']['rate_limit_window_seconds'] ?? 600));
    $now = time();
    $submissions = array_filter(
        $_SESSION['contact_submissions'] ?? [],
        static fn ($timestamp): bool => is_int($timestamp) && $timestamp > ($now - $window)
    );
    $_SESSION['contact_submissions'] = array_values($submissions);
    return count($submissions) >= $limit;
}

function recordSuccessfulSubmission(): void
{
    $_SESSION['contact_submissions'] ??= [];
    $_SESSION['contact_submissions'][] = time();
}

function validateContactInput(array $input): array
{
    $data = [
        'company' => cleanText($input['company'] ?? '', 120),
        'name' => cleanText($input['name'] ?? '', 80),
        'kana' => cleanText($input['kana'] ?? '', 100),
        'tel' => cleanText($input['tel'] ?? '', 30),
        'email' => trim((string) ($input['email'] ?? '')),
        'message' => cleanMultilineText($input['message'] ?? '', 3000),
    ];
    $errors = [];

    if ($data['name'] === '') {
        $errors[] = 'お名前を入力してください。';
    }
    if ($data['email'] === '' || filter_var($data['email'], FILTER_VALIDATE_EMAIL) === false || preg_match('/[\r\n]/', $data['email'])) {
        $errors[] = '正しいメールアドレスを入力してください。';
    }
    if ($data['message'] === '') {
        $errors[] = 'お問い合わせ内容を入力してください。';
    }
    if ($data['tel'] !== '' && !preg_match('/^[0-9+()\-\s]+$/u', $data['tel'])) {
        $errors[] = '電話番号の形式を確認してください。';
    }
    return [$data, $errors];
}

function inputFieldsAreStrings(array $input, array $fieldNames): bool
{
    foreach ($fieldNames as $fieldName) {
        if (array_key_exists($fieldName, $input) && !is_string($input[$fieldName])) {
            return false;
        }
    }
    return true;
}

function cleanText($value, int $maxLength): string
{
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', trim((string) $value)) ?? '';
    $text = preg_replace('/\s+/u', ' ', $text) ?? '';
    return textLength($text) <= $maxLength ? $text : '';
}

function cleanMultilineText($value, int $maxLength): string
{
    $text = str_replace(["\r\n", "\r"], "\n", trim((string) $value));
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    return textLength($text) <= $maxLength ? $text : '';
}

function textLength(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function configuredMailer(array $config): PHPMailer
{
    $smtp = $config['smtp'];
    $mailConfig = $config['mail'];
    $mailer = new PHPMailer(true);
    $mailer->isSMTP();
    $mailer->CharSet = 'UTF-8';
    $mailer->Encoding = 'base64';
    $mailer->Host = (string) $smtp['host'];
    $mailer->Port = (int) $smtp['port'];
    $mailer->SMTPAuth = (bool) ($smtp['auth'] ?? true);
    $mailer->Username = (string) $smtp['username'];
    $mailer->Password = (string) $smtp['password'];
    $mailer->Timeout = 15;
    $mailer->SMTPDebug = 0;

    if ($smtp['encryption'] === 'ssl') {
        $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($smtp['encryption'] === 'tls') {
        $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mailer->SMTPSecure = '';
        $mailer->SMTPAutoTLS = false;
    }
    $mailer->setFrom((string) $mailConfig['from_address'], (string) ($mailConfig['from_name'] ?? '株式会社OWKS'));
    return $mailer;
}

function sendAdminNotification(array $config, array $data): void
{
    $mailer = configuredMailer($config);
    $mailer->addAddress((string) $config['mail']['admin_address']);
    $mailer->addReplyTo($data['email'], $data['name']);
    $mailer->Subject = (string) ($config['mail']['subject_prefix'] ?? '[OWKSお問い合わせ]') . ' ' . $data['name'] . '様';
    $mailer->Body = adminMailBody($data);
    $mailer->send();
}

function sendAutoReply(array $config, array $data): void
{
    $mailer = configuredMailer($config);
    $mailer->addAddress($data['email'], $data['name']);
    $mailer->addReplyTo((string) $config['mail']['admin_address'], (string) ($config['mail']['from_name'] ?? '株式会社OWKS'));
    $mailer->Subject = '【株式会社OWKS】お問い合わせを受け付けました';
    $mailer->Body = autoReplyBody($data);
    $mailer->send();
}

function adminMailBody(array $data): string
{
    return "OWKS Webサイトからお問い合わせがありました。\n\n"
        . "会社名：{$data['company']}\nお名前：{$data['name']}\nフリガナ：{$data['kana']}\n"
        . "電話番号：{$data['tel']}\nメールアドレス：{$data['email']}\n\n"
        . "お問い合わせ内容：\n{$data['message']}\n";
}

function autoReplyBody(array $data): string
{
    return "{$data['name']} 様\n\n株式会社OWKSへお問い合わせいただき、ありがとうございます。\n"
        . "以下の内容でお問い合わせを受け付けました。\n担当者よりご連絡いたしますので、しばらくお待ちください。\n\n"
        . "お問い合わせ内容：\n{$data['message']}\n\n※このメールは自動送信されています。\n株式会社OWKS\n";
}

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
