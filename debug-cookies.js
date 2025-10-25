// Script temporal para debuggear cookies
// Ejecutar con: node debug-cookies.js

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

// Configurar CORS igual que el servidor principal
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(cookieParser());

app.get('/debug-cookies', (req, res) => {
  console.log('🔍 [DEBUG] === COOKIES RECIBIDAS ===');
  console.log('🔍 [DEBUG] req.cookies:', req.cookies);
  console.log('🔍 [DEBUG] Cookies como string:', req.headers.cookie);
  console.log('🔍 [DEBUG] Headers completos:', req.headers);
  console.log('🔍 [DEBUG] === =================== ===');
  
  res.json({
    cookies: req.cookies,
    cookieHeader: req.headers.cookie,
    allHeaders: req.headers,
    cookieKeys: Object.keys(req.cookies || {}),
    cookieCount: Object.keys(req.cookies || {}).length
  });
});

app.listen(3004, () => {
  console.log('🔍 Debug server listening on http://localhost:3004');
  console.log('🔍 Test URL: http://localhost:3004/debug-cookies');
});