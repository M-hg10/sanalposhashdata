require("dotenv").config();

const express = require("express");
const crypto = require("crypto");
const iconv = require("iconv-lite");

const app = express();
app.use(express.json());

// ISO-8859-9 SHA1 + Base64
function sha1Base64Latin5(value) {
  const buffer = iconv.encode(value, "ISO-8859-9");
  return crypto.createHash("sha1").update(buffer).digest("base64");
}

/**
 * HASHDATA ÜRET (Request 1 – 3D)
 */
app.post("/hash/request1", (req, res) => {
  try {
    const {
      MerchantOrderId,
      Amount,
      OkUrl,
      FailUrl
    } = req.body;

    if (!MerchantOrderId || !Amount || !OkUrl || !FailUrl) {
      return res.status(400).json({ error: "Eksik parametre" });
    }

    const MerchantId = process.env.MERCHANT_ID;
    const UserName = process.env.USERNAME;
    const Password = process.env.POS_PASSWORD;

    // 1️⃣ HashedPassword
    const HashedPassword = sha1Base64Latin5(Password);

    // 2️⃣ HashData
    const HashData = sha1Base64Latin5(
      MerchantId +
      MerchantOrderId +
      Amount +
      OkUrl +
      FailUrl +
      UserName +
      HashedPassword
    );

    res.json({
      MerchantId,
      MerchantOrderId,
      Amount,
      OkUrl,
      FailUrl,
      UserName,
      HashData
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * BANKA CEVABI HASH DOĞRULAMA
 */
app.post("/hash/response", (req, res) => {
  try {
    const {
      MerchantOrderId,
      ResponseCode,
      OrderId,
      HashData: BankHash
    } = req.body;

    const Password = process.env.POS_PASSWORD;
    const HashedPassword = sha1Base64Latin5(Password);

    const CalculatedHash = sha1Base64Latin5(
      MerchantOrderId +
      ResponseCode +
      OrderId +
      HashedPassword
    );

    res.json({
      valid: CalculatedHash === BankHash,
      CalculatedHash,
      BankHash
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`✅ FreePOS backend çalışıyor → ${process.env.PORT}`);
});
