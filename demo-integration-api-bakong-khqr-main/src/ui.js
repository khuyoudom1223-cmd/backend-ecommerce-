// src/ui.js
const express = require("express");
const items = require("./item");

const router = express.Router();

router.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Demo Store | Bakong Pay</title>
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
  <h1>🛍️ Demo Store</h1>
  <div id="item-list"></div>

  <div id="qr-section" class="qr-container" style="display:none;">
    <h3>Scan this KHQR to Pay</h3>
    <canvas id="qrCanvas"></canvas>
    <p id="status">Waiting for payment...</p>
  </div>

  <!-- QRious CDN -->
  <script src="https://cdn.jsdelivr.net/npm/qrious/dist/qrious.min.js"></script>

  <script>
    const items = ${JSON.stringify(items)};
    const itemList = document.getElementById("item-list");
    const qrCanvas = document.getElementById("qrCanvas");
    const qrSection = document.getElementById("qr-section");
    const statusEl = document.getElementById("status");

    // Render items
    items.forEach(item => {
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = \`
        <h3>\${item.name}</h3>
        <p>Price: \${item.price.toLocaleString()} \${item.currency}</p>
        <button onclick="pay(\${item.id})">Pay with Bakong</button>
      \`;
      itemList.appendChild(div);
    });

    // Pay with Bakong
    async function pay(id) {
      const product = items.find(i => i.id === id);
      const orderId = "ORDER_" + Date.now();

      const res = await fetch("/api/generate-khqr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: product.price,
          currency: product.currency,
          orderId
        })
      });

      const data = await res.json();
      console.log("✅ KHQR generated:", data);

      if (data.qr) {
        qrSection.style.display = "flex";
        new QRious({
          element: qrCanvas,
          value: data.qr,
          size: 220,
          background: "white",
          foreground: "black",
        });

        statusEl.innerText = "Waiting for payment...";

        // Start checking payment
        checkPayment(data.md5);
      } else {
        alert("❌ Failed to generate KHQR");
      }
    }

    // Auto check payment
    async function checkPayment(md5) {
      const res = await fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md5 })
      });

      const data = await res.json();
      console.log("💰 Payment status:", data);

      if (data.status === "paid") {
        statusEl.innerText = "✅ Payment Successful!";
        statusEl.style.color = "green";
      } else if (data.status === "timeout") {
        statusEl.innerText = "⌛ Payment Timeout";
        statusEl.style.color = "orange";
      } else {
        statusEl.innerText = "❌ Payment Failed or Error";
        statusEl.style.color = "red";
      }
    }
  </script>
</body>
</html>
  `);
});

module.exports = router;
