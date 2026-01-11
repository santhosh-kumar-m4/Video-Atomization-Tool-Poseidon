// routes - will organize routes here later
const express = require('express');
const router = express.Router();

// placeholder route
router.get('/', (req, res) => {
  res.json({ message: 'API routes' });
});

module.exports = router;
