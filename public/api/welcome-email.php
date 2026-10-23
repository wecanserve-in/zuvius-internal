<?php
/**
 * Sends the "your temporary password" welcome email to a newly created employee.
 *
 * Security: only a signed-in, active admin/super_admin (verified Firebase ID token +
 * Firestore profile) can call this, and only for an email that already belongs to an
 * employee profile. Mail goes out through Google Workspace SMTP (the domain's SPF only
 * allows Google), using an app password kept in mail-config.php on the server.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Use POST']);
}

$configFile = __DIR__ . '/mail-config.php';
if (!is_file($configFile)) {
    respond(500, ['ok' => false, 'error' => 'Email is not configured on the server']);
}
/** @var array{from:string,password:string,projectId:string,appUrl:string,tempPassword:string} $cfg */
$cfg = require $configFile;

$input = json_decode((string) file_get_contents('php://input'), true);
$idToken = is_array($input) ? (string) ($input['idToken'] ?? '') : '';
$email = is_array($input) ? trim((string) ($input['email'] ?? '')) : '';
if ($idToken === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, ['ok' => false, 'error' => 'Missing sign-in token or a valid email']);
}

// ── 1. Verify the Firebase ID token (RS256, Google securetoken certs) ──────────
function b64url(string $s): string
{
    return (string) base64_decode(strtr($s, '-_', '+/') . str_repeat('=', (4 - strlen($s) % 4) % 4));
}

function googleCerts(): array
{
    $cache = sys_get_temp_dir() . '/zuvius-securetoken-certs.json';
    if (is_file($cache) && filemtime($cache) > time() - 3600) {
        $data = json_decode((string) file_get_contents($cache), true);
        if (is_array($data)) return $data;
    }
    $raw = @file_get_contents('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    $data = $raw ? json_decode($raw, true) : null;
    if (!is_array($data)) respond(502, ['ok' => false, 'error' => 'Could not reach Google to verify sign-in']);
    @file_put_contents($cache, $raw);
    return $data;
}

$parts = explode('.', $idToken);
if (count($parts) !== 3) respond(401, ['ok' => false, 'error' => 'Invalid sign-in token']);
[$h64, $p64, $s64] = $parts;
$header = json_decode(b64url($h64), true);
$claims = json_decode(b64url($p64), true);
if (!is_array($header) || !is_array($claims) || ($header['alg'] ?? '') !== 'RS256') {
    respond(401, ['ok' => false, 'error' => 'Invalid sign-in token']);
}
$certs = googleCerts();
$cert = $certs[$header['kid'] ?? ''] ?? null;
if (!$cert || openssl_verify("$h64.$p64", b64url($s64), $cert, OPENSSL_ALGO_SHA256) !== 1) {
    respond(401, ['ok' => false, 'error' => 'Sign-in token could not be verified']);
}
$now = time();
$pid = $cfg['projectId'];
if (($claims['aud'] ?? '') !== $pid
    || ($claims['iss'] ?? '') !== "https://securetoken.google.com/$pid"
    || (int) ($claims['exp'] ?? 0) < $now
    || (int) ($claims['iat'] ?? 0) > $now + 300
    || empty($claims['sub'])) {
    respond(401, ['ok' => false, 'error' => 'Sign-in expired — refresh the page and try again']);
}
$uid = (string) $claims['sub'];

// ── 2. Caller must be an active admin; target must be an existing employee ─────
function firestore(string $method, string $path, string $idToken, ?array $body = null): array
{
    $ch = curl_init("https://firestore.googleapis.com/v1/$path");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $idToken, 'Content-Type: application/json'],
        CURLOPT_TIMEOUT => 15,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    $res = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = is_string($res) ? json_decode($res, true) : null;
    return [$code, is_array($json) ? $json : []];
}

$docs = "projects/$pid/databases/(default)/documents";
[$code, $me] = firestore('GET', "$docs/users/$uid", $idToken);
$role = $me['fields']['role']['stringValue'] ?? '';
$active = ($me['fields']['isActive']['booleanValue'] ?? true) !== false;
if ($code !== 200 || !$active || !in_array($role, ['admin', 'super_admin'], true)) {
    respond(403, ['ok' => false, 'error' => 'Only admins can send welcome emails']);
}

[$code, $rows] = firestore('POST', "$docs:runQuery", $idToken, [
    'structuredQuery' => [
        'from' => [['collectionId' => 'users']],
        'where' => ['fieldFilter' => [
            'field' => ['fieldPath' => 'email'],
            'op' => 'EQUAL',
            'value' => ['stringValue' => $email],
        ]],
        'limit' => 1,
    ],
]);
$target = $rows[0]['document']['fields'] ?? null;
if ($code !== 200 || !$target) {
    respond(404, ['ok' => false, 'error' => 'No employee with this email']);
}
$name = trim(preg_replace('/[\r\n]+/', ' ', (string) ($target['displayName']['stringValue'] ?? '')));
$firstName = $name !== '' ? explode(' ', $name)[0] : 'there';

// ── 3. Compose ─────────────────────────────────────────────────────────────────
$appUrl = $cfg['appUrl'];
$temp = $cfg['tempPassword'];
$subject = 'Welcome to Zuvius Internal – your login details';
$h = fn(string $s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

$text = "Hi $firstName,\n\n"
    . "Your Zuvius Internal account is ready.\n\n"
    . "Sign in at: $appUrl\n"
    . "Email: $email\n"
    . "Temporary password: $temp\n\n"
    . "The first time you sign in you will be asked to choose your own password.\n\n"
    . "— Zuvius Lifesciences\n";

$html = '<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7fc;font-family:Segoe UI,Arial,sans-serif;color:#1e1b3a">'
    . '<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e0e3f1;border-radius:12px">'
    . '<tr><td style="background:#4f46e5;color:#ffffff;padding:18px 24px;border-radius:12px 12px 0 0;font-size:18px;font-weight:600">Zuvius Internal</td></tr>'
    . '<tr><td style="padding:24px">'
    . '<p style="margin:0 0 12px">Hi ' . $h($firstName) . ',</p>'
    . '<p style="margin:0 0 16px">Your Zuvius Internal account is ready. Use these details to sign in:</p>'
    . '<table role="presentation" style="width:100%;background:#eef2ff;border-radius:8px;padding:12px 16px;margin:0 0 16px">'
    . '<tr><td style="padding:4px 0;color:#5b5f7a">Email</td><td style="padding:4px 0;font-weight:600">' . $h($email) . '</td></tr>'
    . '<tr><td style="padding:4px 0;color:#5b5f7a">Temporary password</td><td style="padding:4px 0;font-weight:600;font-family:Consolas,monospace">' . $h($temp) . '</td></tr>'
    . '</table>'
    . '<p style="margin:0 0 20px"><a href="' . $h($appUrl) . '" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">Sign in to Zuvius Internal</a></p>'
    . '<p style="margin:0;color:#5b5f7a;font-size:13px">The first time you sign in you will be asked to choose your own password.</p>'
    . '</td></tr></table>'
    . '<p style="text-align:center;color:#9aa0a6;font-size:12px;margin-top:16px">Zuvius Lifesciences</p>'
    . '</body></html>';

// ── 4. Send via Google Workspace SMTP (SSL 465, AUTH LOGIN) ─────────────────────
function smtpSend(array $cfg, string $to, string $subject, string $text, string $html): ?string
{
    $fp = @stream_socket_client('ssl://smtp.gmail.com:465', $errno, $errstr, 20);
    if (!$fp) return "Could not connect to the mail server ($errstr)";
    stream_set_timeout($fp, 20);
    $read = function () use ($fp): string {
        $out = '';
        while (($line = fgets($fp, 1024)) !== false) {
            $out .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') break;
        }
        return $out;
    };
    $cmd = function (string $c, array $expect) use ($fp, $read): ?string {
        if ($c !== '') fwrite($fp, $c . "\r\n");
        $res = $read();
        return in_array((int) substr($res, 0, 3), $expect, true) ? null : trim($res);
    };
    $from = $cfg['from'];
    $boundary = 'zv' . bin2hex(random_bytes(8));
    $domain = substr(strrchr($from, '@'), 1);
    $headers = implode("\r\n", [
        'From: "Zuvius Internal" <' . $from . '>',
        'To: <' . $to . '>',
        'Subject: =?UTF-8?B?' . base64_encode($subject) . '?=',
        'Date: ' . date('r'),
        'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
    ]);
    $body = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text))
        . "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html))
        . "--$boundary--\r\n";
    $steps = [
        ['', [220]],
        ['EHLO ' . $domain, [250]],
        ['AUTH LOGIN', [334]],
        [base64_encode($from), [334]],
        [base64_encode($cfg['password']), [235]],
        ['MAIL FROM:<' . $from . '>', [250]],
        ['RCPT TO:<' . $to . '>', [250, 251]],
        ['DATA', [354]],
        [$headers . "\r\n\r\n" . $body . '.', [250]],
    ];
    foreach ($steps as [$c, $expect]) {
        $err = $cmd($c, $expect);
        if ($err !== null) {
            fclose($fp);
            return str_starts_with($c, base64_encode($cfg['password'])) || str_contains($err, '535')
                ? 'Google rejected the app password for ' . $from
                : 'Mail server error: ' . $err;
        }
    }
    $cmd('QUIT', [221]);
    fclose($fp);
    return null;
}

$err = smtpSend($cfg, $email, $subject, $text, $html);
if ($err !== null) {
    respond(502, ['ok' => false, 'error' => $err]);
}
respond(200, ['ok' => true]);
