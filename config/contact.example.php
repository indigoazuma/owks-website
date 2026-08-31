<?php

declare(strict_types=1);

return [
    'enabled' => false,
    'smtp' => [
        'host' => '',
        'port' => null,
        'username' => '',
        'password' => '',
        'encryption' => '',
        'auth' => true,
    ],
    'mail' => [
        'from_address' => '',
        'from_name' => '株式会社OWKS',
        'admin_address' => '',
        'subject_prefix' => '[OWKSお問い合わせ]',
    ],
    'security' => [
        'allowed_origins' => [],
        'minimum_fill_seconds' => 3,
        'rate_limit_count' => 3,
        'rate_limit_window_seconds' => 600,
    ],
];
