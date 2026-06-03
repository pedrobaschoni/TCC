// server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

const app = express();
app.use(cors());
app.use(express.json());

let db: Database;

async function inicializarBanco() {
  db = await open({
    filename: './banco_tcc.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS alertas (
      id TEXT PRIMARY KEY,
      magnitude REAL,
      lat REAL,
      lng REAL,
      timestamp TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS contatos_emergencia (
      id TEXT PRIMARY KEY,
      nome TEXT,
      telefone TEXT
    )
  `);
  
  console.log('📦 Banco SQLite inicializado (Alertas e Contatos)!');
}

// ================= ROTAS DE QUEDA =================

app.post('/api/quedas', async (req: Request, res: Response) => {
  const { magnitude, lat, lng } = req.body;

  if (!magnitude) return res.status(400).json({ error: 'Magnitude obrigatória' });

  const id = Math.random().toString(36).substring(2, 11);
  const timestamp = new Date().toISOString(); 

  try {
    await db.run(
      `INSERT INTO alertas (id, magnitude, lat, lng, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [id, magnitude, lat, lng, timestamp]
    );

    console.log('🚨 ALERTA SALVO! Iniciando protocolo de emergência...');

    // Busca contatos para disparar alertas
    const contatos = await db.all(`SELECT * FROM contatos_emergencia`);
    console.log(`Buscando ajuda... Notificando ${contatos.length} contatos cadastrados e o 193 (Bombeiros).`);
    
    contatos.forEach(contato => {
      console.log(`📲 Enviando SMS para ${contato.nome} (${contato.telefone}): "Queda detectada! Lat: ${lat}, Lng: ${lng}"`);
    });

    res.status(201).json({ message: 'Alerta processado', id });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar alerta' });
  }
});

app.get('/api/quedas', async (req: Request, res: Response) => {
  const alertas = await db.all(`SELECT * FROM alertas ORDER BY timestamp DESC`);
  res.status(200).json(alertas);
});

// ================= ROTAS DE CONTATOS =================

app.post('/api/contatos', async (req: Request, res: Response) => {
  const { nome, telefone } = req.body;
  
  if (!nome || !telefone) return res.status(400).json({ error: 'Nome e telefone obrigatórios' });

  const id = Math.random().toString(36).substring(2, 11);

  try {
    await db.run(`INSERT INTO contatos_emergencia (id, nome, telefone) VALUES (?, ?, ?)`, [id, nome, telefone]);
    res.status(201).json({ message: 'Contato salvo', id, nome, telefone });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar contato' });
  }
});

app.get('/api/contatos', async (req: Request, res: Response) => {
  const contatos = await db.all(`SELECT * FROM contatos_emergencia`);
  res.status(200).json(contatos);
});

// ================= START SERVER =================
const PORT = 3000;
inicializarBanco().then(() => {
  app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
});