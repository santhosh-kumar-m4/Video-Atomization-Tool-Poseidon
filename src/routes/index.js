// routes file - will add actual routes here
const express = require('express');
const router = express.Router();

// test route
router.get('/', (req, res) => {
  res.json({ message: 'API routes' });
});

module.exports = router;
