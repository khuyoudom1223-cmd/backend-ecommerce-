<?php
$ch = curl_init('https://sit-api-bakong.nbc.gov.kh/v1/check_transaction_by_md5');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiNzZjMzgyMGYzYjA1NDY1ZCJ9LCJpYXQiOjE3Nzc3MTg2MzEsImV4cCI6MTc4NTQ5NDYzMX0.x96gmQZt6ZFumimiuvRzPmPovLIAJnTI3f4w4AixhWI', 'Content-Type: application/json', 'User-Agent: PostmanRuntime/7.28.4']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['md5' => 'test']));
echo curl_exec($ch);

