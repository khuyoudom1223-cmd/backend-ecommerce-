<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\RequestException;

class BakongService
{
    protected $baseUrl;
    protected $token;
    protected $merchantId;
    protected $merchantName;

    public function __construct()
    {
        $env = env('APP_ENV', 'local');
        $this->baseUrl = ($env === 'production') ? env('BAKONG_PROD_BASE_API_URL') : env('BAKONG_DEV_BASE_API_URL');
        $this->token = env('BAKONG_TOKEN');
        $this->merchantId = env('BAKONG_MERCHANT_ID');
        $this->merchantName = env('BAKONG_MERCHANT_NAME');
    }

    public function getBaseUrl(): string
    {
        return rtrim((string) $this->baseUrl, '/');
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    protected function base64UrlDecode(string $value): string
    {
        $remainder = strlen($value) % 4;
        if ($remainder) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }

    public function tokenIsExpired(): bool
    {
        if (!$this->token || !str_contains($this->token, '.')) {
            return true;
        }

        $parts = explode('.', $this->token);
        if (count($parts) < 2) {
            return true;
        }

        $payload = json_decode($this->base64UrlDecode($parts[1]), true);
        $exp = data_get($payload, 'exp');

        return !$exp || now()->timestamp >= (int) $exp;
    }

    public function validationErrors(): array
    {
        $errors = [];

        if (empty($this->baseUrl)) {
            $errors[] = 'Bakong API base URL is missing.';
        }
        if (empty($this->token)) {
            $errors[] = 'Bakong token is missing.';
        } elseif ($this->tokenIsExpired()) {
            $errors[] = 'Bakong token is expired.';
        }
        if (empty($this->merchantId)) {
            $errors[] = 'Bakong merchant ID is missing.';
        }
        if (empty($this->merchantName)) {
            $errors[] = 'Bakong merchant name is missing.';
        }

        return $errors;
    }

    protected function headers()
    {
        return [
            'Authorization' => 'Bearer ' . $this->token,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];
    }

    /**
     * Generate KHQR payload via offline Node.js script (no external API needed).
     */
    public function generateKHQR(string $invoiceId, float $amount, string $currency = 'USD'): array
    {
        if (empty($this->merchantId)) {
            Log::error('Bakong KHQR: merchant ID is missing.');
            return ['error' => true, 'message' => 'Bakong merchant ID is missing.'];
        }
        if (empty($this->merchantName)) {
            Log::error('Bakong KHQR: merchant name is missing.');
            return ['error' => true, 'message' => 'Bakong merchant name is missing.'];
        }

        $amountStr = number_format($amount, 2, '.', '');
        $scriptPath = base_path('generate_khqr.cjs');

        $descriptorSpec = [
            0 => ['pipe', 'r'],  // stdin
            1 => ['pipe', 'w'],  // stdout
            2 => ['pipe', 'w'],  // stderr
        ];

        $cmd = sprintf(
            'node %s %s %s %s %s %s',
            escapeshellarg($scriptPath),
            escapeshellarg($this->merchantId),
            escapeshellarg($this->merchantName),
            escapeshellarg($amountStr),
            escapeshellarg($currency),
            escapeshellarg($invoiceId)
        );

        $process = proc_open($cmd, $descriptorSpec, $pipes);

        if (!is_resource($process)) {
            Log::error('Offline KHQR: failed to start node process', ['cmd' => $cmd]);
            return ['error' => true, 'message' => 'Offline KHQR generation failed (process error).'];
        }

        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($process);

        $json = json_decode(trim($stdout), true);

        if (!$json || !empty($json['error'])) {
            $errMsg = $json['message'] ?? trim($stderr) ?: 'Unknown error';
            Log::error('Offline KHQR generation failed', [
                'cmd'    => $cmd,
                'stdout' => $stdout,
                'stderr' => $stderr,
                'parsed' => $json,
            ]);
            return [
                'error'   => true,
                'message' => 'Offline KHQR generation failed: ' . $errMsg,
                'status'  => 500,
            ];
        }

        $qrString = data_get($json, 'qr');

        return [
            'success'     => true,
            'invoice_id'  => $invoiceId,
            'amount'      => $amountStr,
            'currency'    => $currency,
            'qr_string'   => is_string($qrString) ? $qrString : null,
            'qr_image_url'=> null,
            'md5'         => data_get($json, 'md5'),
            'raw'         => $json,
        ];
    }

    /**
     * Check payment status by invoice id
     */
    public function checkPayment(string $invoiceId): array
    {
        $validationErrors = $this->validationErrors();
        if (!empty($validationErrors)) {
            Log::error('Bakong payment status validation failed', ['errors' => $validationErrors]);
            return ['error' => true, 'message' => implode(' ', $validationErrors)];
        }

        $endpoint = $this->getBaseUrl() . '/payments/status/' . urlencode($invoiceId);
        $response = Http::withHeaders($this->headers())
            ->acceptJson()
            ->timeout(30)
            ->retry(2, 200)
            ->get($endpoint);

        if ($response->failed()) {
            Log::error('Bakong payment status failed', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return [
                'error' => true,
                'message' => 'Bakong payment status check failed.',
                'status' => $response->status(),
                'response' => $response->json() ?? $response->body(),
            ];
        }

        return $response->json();
    }

    /**
     * Check payment status by MD5 hash (compat with demo)
     * Returns normalized array similar to Node demo response
     */
    public function checkPaymentByMd5(string $md5): array
    {
        $validationErrors = $this->validationErrors();
        if (!empty($validationErrors)) {
            Log::error('Bakong payment status validation failed', ['errors' => $validationErrors]);
            return ['error' => true, 'message' => implode(' ', $validationErrors)];
        }

        $endpoint = $this->getBaseUrl() . '/check_transaction_by_md5';

        $response = Http::withHeaders($this->headers())
            ->acceptJson()
            ->timeout(30)
            ->retry(2, 200)
            ->post($endpoint, ['md5' => $md5]);

        if ($response->failed()) {
            Log::error('Bakong check by md5 failed', [
                'endpoint' => $endpoint,
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

            return [
                'error' => true,
                'message' => 'Bakong check by md5 failed.',
                'status' => $response->status(),
                'response' => $response->json() ?? $response->body(),
            ];
        }

        $json = $response->json();

        // Normalize to demo-friendly structure
        $respCode = data_get($json, 'responseCode', null);
        $data = data_get($json, 'data', []);

        if ($respCode === 0 && !empty($data)) {
            $isPaid = !empty(data_get($data, 'toAccountId'));
            return [
                'paid' => $isPaid,
                'hash' => data_get($data, 'hash') ?? $md5,
                'amount' => data_get($data, 'amount', 0),
                'from' => data_get($data, 'fromAccountId', 'unknown'),
                'to' => $isPaid ? data_get($data, 'toAccountId') : 'unknown',
                'timestamp' => isset($data['createdDateMs']) ? date('c', intval($data['createdDateMs']/1000)) : now()->toDateTimeString(),
                'raw' => $json,
            ];
        }

        return [
            'paid' => false,
            'hash' => $md5,
            'amount' => 0,
            'from' => 'unknown',
            'to' => 'unknown',
            'timestamp' => now()->toDateTimeString(),
            'raw' => $json,
        ];
    }
}
