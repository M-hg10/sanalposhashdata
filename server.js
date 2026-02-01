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
      MerchantId,
      MerchantOrderId,
      Amount,
      OkUrl,
      FailUrl,
      UserName,
      Password
    } = req.body;

    // ENV fallback
    const _MerchantId = MerchantId || process.env.MERCHANT_ID;
    const _UserName   = UserName   || process.env.USERNAME;
    const _Password   = Password   || process.env.POS_PASSWORD;

    if (
      !_MerchantId ||
      !MerchantOrderId ||
      !Amount ||
      !OkUrl ||
      !FailUrl ||
      !_UserName ||
      !_Password
    ) {
      return res.status(400).json({ error: "Eksik parametre" });
    }

    // 1️⃣ HashedPassword
    const HashedPassword = sha1Base64Latin5(_Password);

    // 2️⃣ HashData
    const HashData = sha1Base64Latin5(
      _MerchantId +
      MerchantOrderId +
      Amount +
      OkUrl +
      FailUrl +
      _UserName +
      HashedPassword
    );

    res.json({
      MerchantId: _MerchantId,
      MerchantOrderId,
      Amount,
      OkUrl,
      FailUrl,
      UserName: _UserName,
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
      HashData: BankHash,
      Password
    } = req.body;

    const _Password = Password || process.env.POS_PASSWORD;

    if (!MerchantOrderId || !ResponseCode || !OrderId || !BankHash || !_Password) {
      return res.status(400).json({ error: "Eksik parametre" });
    }

    const HashedPassword = sha1Base64Latin5(_Password);

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

app.listen(process.env.PORT || 3000, () => {
  console.log(`✅ FreePOS backend çalışıyor → http://localhost:${process.env.PORT || 3000}`);
});

// POST /hash/request1
// {
//   "MerchantId": "496",
//   "UserName": "apiuser",
//   "Password": "123456",
//   "MerchantOrderId": "20240128001",
//   "Amount": "10000",
//   "OkUrl": "https://site.com/ok",
//   "FailUrl": "https://site.com/fail"
// }