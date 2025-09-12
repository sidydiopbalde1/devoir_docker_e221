const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Route de santé pour Render
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route principale
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Devoir Docker E221</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 50px;
        }
        .container { 
          background: rgba(255,255,255,0.1); 
          padding: 30px; 
          border-radius: 15px; 
          backdrop-filter: blur(10px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚀 Hello depuis Docker sur Render!</h1>
        <p>✅ Déployé avec GitHub Actions CI/CD</p>
        <p>🐳 Container démarré le: ${new Date().toLocaleString()}</p>
        <p>⚡ Uptime: ${Math.floor(process.uptime())}s</p>
        <a href="/health" style="color: #ffeb3b;">🔍 Health Check</a>
      </div>
    </body>
    </html>
  `);
});

// Route API
app.get('/api/info', (req, res) => {
  res.json({
    message: 'API fonctionnelle!',
    version: '1.0.0',
    node_version: process.version,
    platform: process.platform,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${port}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});