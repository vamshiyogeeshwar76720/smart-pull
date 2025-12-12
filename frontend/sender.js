let scannedData = null;

const html5QrCode = new Html5Qrcode("reader");

html5QrCode.start(
  { facingMode: "environment" },
  { fps: 10, qrbox: 250 },
  (decoded) => {
    try {
      scannedData = JSON.parse(decoded);

      document.getElementById("qrBlockchain").innerText =
        scannedData.blockchain;

      document.getElementById("qrToken").innerText = scannedData.token;

      document.getElementById("qrReceiver").innerText = scannedData.receiver;

      document.getElementById("infoBox").style.display = "block";

      html5QrCode.stop();
    } catch (e) {
      alert("Invalid QR");
    }
  }
);
