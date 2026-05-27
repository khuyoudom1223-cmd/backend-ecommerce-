export const success = (res, data, status = 200) => {
  res.status(status).json({ success: true, data });
};

export const error = (res, status, message) => {
  res.status(status).json({ success: false, message });
};
