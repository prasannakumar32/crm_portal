const express = require('express');
const path = require('path');
const { renderAppShell } = require('./app-shell');

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, 'public');

app.use(express.static(publicPath));

// SPA fallback
app.get('*', (req, res) => {
  res.type('html').send(renderAppShell());
});

app.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`);
});
