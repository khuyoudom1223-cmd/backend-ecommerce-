export default (err, req, res, next) => {
  console.error('❗️', err);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
