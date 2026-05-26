<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Demo Store | Bakong Pay (Laravel)</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 650px; margin: 30px auto; padding: 20px; background: #fafafa; }
    h1 { text-align: center; color: #222; }
    .item { background: #fff; border: 1px solid #ddd; padding: 16px; margin-bottom: 12px; border-radius: 10px; }
    button { background: #007bff; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
    button:hover { background: #0062cc; }
    .qr-container { display: flex; flex-direction: column; align-items: center; margin-top: 25px; }
    #status { text-align: center; font-weight: bold; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>🛍️ Demo Store (Laravel KHQR)</h1>
  <div id="item-list"></div>

  <div id="qr-section" class="qr-container" style="display:none;">
    <h3>Scan this KHQR to Pay</h3>
    <canvas id="qrCanvas"></canvas>
    <p id="status">Waiting for payment...</p>
  </div>

  <!-- QRious CDN -->
  <script src="https://cdn.jsdelivr.net/npm/qrious/dist/qrious.min.js"></script>

  <script>
    const items = [
      { id: 1, name: "T-Shirt", price: 100, currency: "KHR" },
      { id: 2, name: "Jeans", price: 100, currency: "KHR" },
      { id: 3, name: "Jacket", price: 100, currency: "KHR" },
    ];

    const itemList = document.getElementById("item-list");
    const qrCanvas = document.getElementById("qrCanvas");
    const qrSection = document.getElementById("qr-section");
    const statusEl = document.getElementById("status");

    // Render items
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <h3>${item.name}</h3>
        <p>Price: ${item.price.toLocaleString()} ${item.currency}</p>
        <button onclick="pay(${item.id})">Pay with Bakong</button>
      `;
      itemList.appendChild(div);
    });

    // Pay with Bakong (Laravel endpoints)
    async function pay(id) {
      const product = items.find(i => i.id === id);
      // create a simple order via payments/khqr
      const res = await fetch('/api/payments/khqr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: product.price, product_name: product.name })
      });

      const data = await res.json();
      console.log('✅ KHQR generated (Laravel):', data);

      // prefer qr_string then qr_image_url
      const khqr = data.khqr || {};
      const qrValue = khqr.qr_string || khqr.qr_image_url || data.raw?.qr || data.raw?.data?.qr;

      if (qrValue) {
        qrSection.style.display = 'flex';
        new QRious({ element: qrCanvas, value: qrValue, size: 220, background: 'white', foreground: 'black' });
        statusEl.innerText = 'Waiting for payment...';

        // Start checking payment by order id
        const orderId = data.order_id || data.invoice_id || null;
        if (orderId) {
          checkPayment(orderId);
        } else {
          console.warn('No order_id returned to poll status.');
        }
      } else {
        alert('❌ Failed to generate KHQR');
      }
    }

    // Polling check via GET /api/payments/status/{orderId}
    async function checkPayment(orderId, interval = 2000, timeout = 60000) {
      const start = Date.now();

      const poll = async () => {
        try {
          const res = await fetch(`/api/payments/status/${orderId}`);
          const data = await res.json();
          console.log('💰 Payment status:', data);

          if (data.paid === true) {
            statusEl.innerText = '✅ Payment Successful!';
            statusEl.style.color = 'green';
            return;
          }

          const elapsed = Date.now() - start;
          if (elapsed >= timeout) {
            statusEl.innerText = '⌛ Payment Timeout';
            statusEl.style.color = 'orange';
            return;
          }

          // still pending
          setTimeout(poll, interval);
        } catch (err) {
          console.error('Error checking payment', err);
          statusEl.innerText = '❌ Payment Check Error';
          statusEl.style.color = 'red';
        }
      };

      poll();
    }
  </script>
</body>
</html>
