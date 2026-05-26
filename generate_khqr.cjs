const { BakongKHQR, khqrData, IndividualInfo } = require('bakong-khqr');

const args = process.argv.slice(2);
if (args.length < 5) {
    process.stderr.write(JSON.stringify({ error: true, message: "Missing arguments" }) + "\n");
    process.exit(1);
}

const [merchantId, merchantName, amountRaw, currency, orderId] = args;

try {
    const expirationTimestamp = Date.now() + 15 * 60 * 1000;
    const isKHR = currency.toUpperCase() === "KHR";

    // KHR must be integer, USD uses 2 decimal places
    const amount = isKHR ? Math.round(parseFloat(amountRaw)) : parseFloat(parseFloat(amountRaw).toFixed(2));

    if (!amount || amount <= 0) {
        throw new Error("Amount must be greater than zero");
    }

    const optionalData = {
        currency: isKHR ? khqrData.currency.khr : khqrData.currency.usd,
        amount: amount,
        billNumber: orderId,
        storeLabel: "Azurea",
        terminalLabel: "Online Payment",
        expirationTimestamp,
    };

    const individualInfo = new IndividualInfo(
        merchantId,
        merchantName,
        "Phnom Penh",
        optionalData
    );

    const khqr = new BakongKHQR();
    const qrData = khqr.generateIndividual(individualInfo);

    if (!qrData || !qrData.data || qrData.status?.code !== 0) {
        const errMsg = qrData?.status?.message || "Invalid QR response";
        throw new Error(errMsg);
    }

    process.stdout.write(JSON.stringify({
        success: true,
        qr: qrData.data.qr,
        md5: qrData.data.md5
    }) + "\n");
} catch (error) {
    process.stderr.write(JSON.stringify({ error: true, message: error.message }) + "\n");
    process.exit(1);
}
