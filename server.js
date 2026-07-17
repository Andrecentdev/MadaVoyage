const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Connexion PostgreSQL (base Replit / Supabase en production)
// Supabase et Render exigent SSL. On active SSL dès que la DB n'est pas localhost.
function buildPoolConfig(url) {
  if (!url) return {};
  const isRemote = !/localhost|127\.0\.0\.1/.test(url);
  return {
    connectionString: url,
    ssl: isRemote ? { rejectUnauthorized: false } : false
  };
}
const db = new Pool(buildPoolConfig(process.env.DATABASE_URL));
db.connect()
  .then(client => { client.release(); console.log('PostgreSQL connecté'); })
  .catch(err => { console.error('⚠️  Connexion DB échouée :', err.message); });

// Dossiers d'images (destinations pré-fournies + photos de chauffeurs uploadées)
const DRIVERS_DIR = path.join(__dirname, 'public', 'images', 'drivers');
const DESTINATIONS_DIR = path.join(__dirname, 'public', 'images', 'destinations');
fs.mkdirSync(DRIVERS_DIR, { recursive: true });
fs.mkdirSync(DESTINATIONS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, DRIVERS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `driver-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype))
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Convertit les colonnes NUMERIC (renvoyées en string par pg) en nombres JS
function toNumbers(row, keys) {
  const copy = { ...row };
  keys.forEach(k => { if (copy[k] !== null && copy[k] !== undefined) copy[k] = Number(copy[k]); });
  return copy;
}

// ---------- API publique ----------
app.get('/api/trips', (req, res) => {
  db.query('SELECT * FROM trips WHERE active = true ORDER BY departure_time')
    .then(({ rows }) => res.json(rows.map(r => toNumbers(r, ['price']))))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/occupied-seats/:tripId', (req, res) => {
  db.query('SELECT seat_number FROM occupied_seats WHERE trip_id = $1', [req.params.tripId])
    .then(({ rows }) => res.json(rows.map(r => r.seat_number)))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/reservations', async (req, res) => {
  const { trip_id, customer_name, customer_phone, customer_email, seats_count, luggage, selected_seats, payment_method, total, insurance, promo_code } = req.body;
  const id = 'MB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO reservations (id, trip_id, customer_name, customer_phone, customer_email, seats_count, luggage, selected_seats, payment_method, total, status, insurance, promo_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confirmed', $11, $12)`,
      [id, trip_id, customer_name, customer_phone, customer_email, seats_count, luggage, selected_seats, payment_method, total, !!insurance, promo_code]
    );
    const seats = selected_seats.split(',').map(Number);
    for (const seat of seats) {
      await client.query('INSERT INTO occupied_seats (trip_id, seat_number) VALUES ($1, $2)', [trip_id, seat]);
    }
    await client.query('COMMIT');
    res.json({ id, status: 'confirmed' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get('/api/reservations', (req, res) => {
  db.query('SELECT * FROM reservations ORDER BY created_at DESC')
    .then(({ rows }) => res.json(rows.map(r => toNumbers(r, ['total']))))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/reservations/:id/cancel', (req, res) => {
  db.query('UPDATE reservations SET status = $1 WHERE id = $2', ['cancelled', req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.query('SELECT * FROM admins WHERE username = $1 AND password = $2', [username, password])
    .then(({ rows }) => {
      if (rows.length === 0) return res.status(401).json({ error: 'Identifiants incorrects' });
      res.json({ success: true });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/promos', (req, res) => {
  db.query('SELECT * FROM promos WHERE active = true')
    .then(({ rows }) => res.json(rows.map(r => toNumbers(r, ['value']))))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/drivers', (req, res) => {
  db.query('SELECT * FROM drivers ORDER BY created_at DESC')
    .then(({ rows }) => res.json(rows.map(r => toNumbers(r, ['rating', 'trips_completed']))))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Images de destination pré-chargées (utilisées lors de l'ajout d'un trajet)
app.get('/api/destination-images', (req, res) => {
  fs.readdir(DESTINATIONS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const images = files
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .map(f => ({ name: path.parse(f).name, url: `/images/destinations/${f}` }));
    res.json(images);
  });
});

// ---------- API admin ----------
app.post('/api/admin/trips', (req, res) => {
  const { departure, destination, departure_time, duration, driver, price, image_url } = req.body;
  if (!departure || !destination || !departure_time || !price) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  const id = 'T-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  db.query(
    `INSERT INTO trips (id, departure, destination, departure_time, duration, driver, price, image_url, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
    [id, departure, destination, departure_time, duration || '', driver || '', price, image_url || null]
  )
    .then(({ rows }) => res.json(toNumbers(rows[0], ['price'])))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.put('/api/admin/trips/:id/deactivate', (req, res) => {
  db.query('UPDATE trips SET active = false WHERE id = $1', [req.params.id])
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.post('/api/admin/drivers', upload.single('photo'), (req, res) => {
  const { name, phone, usual_route } = req.body;
  if (!name) return res.status(400).json({ error: 'Le nom est requis' });
  const photo_url = req.file ? `/images/drivers/${req.file.filename}` : null;
  db.query(
    `INSERT INTO drivers (name, phone, usual_route, photo_url) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, phone || null, usual_route || null, photo_url]
  )
    .then(({ rows }) => res.json(toNumbers(rows[0], ['rating', 'trips_completed'])))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Inscription rapide d'un client (guichet / téléphone) depuis la page admin
app.post('/api/admin/customers', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis' });
  db.query('INSERT INTO customers (name, phone) VALUES ($1, $2) RETURNING *', [name, phone])
    .then(({ rows }) => res.json(rows[0]))
    .catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/admin/customers', (req, res) => {
  db.query('SELECT * FROM customers ORDER BY created_at DESC')
    .then(({ rows }) => res.json(rows))
    .catch(err => res.status(500).json({ error: err.message }));
});

// ---------- Routes des pages ----------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/reservation', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reservation.html')));
app.get('/sieges', (req, res) => res.sendFile(path.join(__dirname, 'public', 'seats.html')));
app.get('/paiement', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment.html')));
app.get('/confirmation', (req, res) => res.sendFile(path.join(__dirname, 'public', 'confirmation.html')));
app.get('/mes-reservations', (req, res) => res.sendFile(path.join(__dirname, 'public', 'my-reservations.html')));
app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// 404
app.use((req, res) => res.status(404).send('<h1>Page introuvable</h1><a href="/">Retour à l\'accueil</a>'));

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
