import app from './config/express';
import sequelize from './config/database';
import contrattiRoutes from './routes/contrattiRoutes';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Routes
app.use('/api/contratti', contrattiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Avvia il server
const startServer = async () => {
  try {
    // Sincronizza il database (crea le tabelle se non esistono)
    await sequelize.sync({ alter: true });
    console.log('📦 Database sincronizzato');

    app.listen(PORT, () => {
      console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Errore avvio server:', error);
    process.exit(1);
  }
};

startServer();