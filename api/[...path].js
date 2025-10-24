const app = require('../app');

// Vercel Node Serverless Function: catch-all under /api/*
// This forwards every /api/* request to the Express app, including static and dynamic routes.
module.exports = (req, res) => {
  // Let Express handle CORS, sessions, routes, static files, and errors
  return app(req, res);
};