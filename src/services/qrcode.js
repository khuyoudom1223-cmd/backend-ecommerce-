import QRCode from 'qrcode';

export const generateQRCode = async (text) => {
  // Returns a data URL (base64 PNG) suitable for sending to frontend
  return await QRCode.toDataURL(text, { errorCorrectionLevel: 'H', margin: 1 });
};
