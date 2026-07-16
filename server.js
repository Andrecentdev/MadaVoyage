const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Connexion Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY manquants !');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase connecté');

// Dossiers d'images
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

// ---------- API PUBLIQUE ----------

// Récupérer tous les trajets
app.get('/api/trips', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('active', true)
      .order('departure_time', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les sièges occupés
app.get('/api/occupied-seats/:tripId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('occupied_seats')
      .select('seat_number')
      .eq('trip_id', req.params.tripId);
    
    if (error) throw error;
    res.json(data.map(r => r.seat_number));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une réservation
app.post('/api/reservations', async (req, res) => {
  const { trip_id, customer_name, customer_phone, customer_email, seats_count, luggage, selected_seats, payment_method, total, insurance, promo_code, travel_date } = req.body;
  const id = 'MB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  
  try {
    // Insérer la réservation
    const { error: reservationError } = await supabase
      .from('reservations')
      .insert([{
        id,
        trip_id,
        customer_name,
        customer_phone,
        customer_email,
        seats_count,
        luggage,
        selected_seats,
        payment_method,
        total,
        status: 'pending',
        insurance: !!insurance,
        promo_code: promo_code || null,
        travel_date: travel_date || null
      }]);
    
    if (reservationError) throw reservationError;

    // Insérer les sièges occupés
    const seats = selected_seats.split(',').map(s => s.trim()).filter(Boolean);
    for (const seat of seats) {
      const { error: seatError } = await supabase
        .from('occupied_seats')
        .insert([{ trip_id, seat_number: seat }]);
      
      if (seatError) throw seatError;
    }

    res.json({ id, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer toutes les réservations
app.get('/api/reservations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Changer le statut d'une réservation
app.put('/api/reservations/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide' });
  }

  try {
    // Mettre à jour le statut
    const { data, error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'Réservation introuvable' });

    // Ajouter un message si confirmé
    if (status === 'confirmed') {
      await supabase
        .from('messages')
        .insert([{
          reservation_id: req.params.id,
          customer_phone: data[0].customer_phone,
          message: `Votre réservation ${req.params.id} est confirmée ✅. Vous pouvez télécharger votre ticket.`
        }]);
    } else if (status === 'cancelled') {
      await supabase
        .from('messages')
        .insert([{
          reservation_id: req.params.id,
          customer_phone: data[0].customer_phone,
          message: `Votre réservation ${req.params.id} a été annulée.`
        }]);
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Annuler une réservation
app.put('/api/reservations/:id/cancel', async (req, res) => {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une réservation (admin)
app.delete('/api/admin/reservations/:id', async (req, res) => {
  try {
    // Récupérer la réservation
    const { data: reservation, error: fetchError } = await supabase
      .from('reservations')
      .select('trip_id, selected_seats')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError) throw fetchError;

    // Supprimer les sièges occupés
    if (reservation) {
      const seats = reservation.selected_seats.split(',').map(s => s.trim());
      for (const seat of seats) {
        await supabase
          .from('occupied_seats')
          .delete()
          .eq('trip_id', reservation.trip_id)
          .eq('seat_number', seat);
      }
    }

    // Supprimer la réservation
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', req.params.id);
    
    if (deleteError) throw deleteError;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Messages d'un client
app.get('/api/messages/:phone', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('customer_phone', req.params.phone)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login admin
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .eq('password', password);
    
    if (error) throw error;
    if (!data.length) return res.status(401).json({ error: 'Identifiants incorrects' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les promos
app.get('/api/promos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('promos')
      .select('*')
      .eq('active', true);
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les chauffeurs
app.get('/api/drivers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Images de destination
app.get('/api/destination-images', (req, res) => {
  fs.readdir(DESTINATIONS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: err.message });
    const images = files
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .map(f => ({ name: path.parse(f).name, url: `/images/destinations/${f}` }));
    res.json(images);
  });
});

// ---------- API ADMIN ----------

// Créer un trajet
app.post('/api/admin/trips', async (req, res) => {
  const { departure, destination, departure_time, duration, driver, price, image_url } = req.body;
  if (!departure || !destination || !departure_time || !price) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  
  const id = 'T-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  try {
    const { data, error } = await supabase
      .from('trips')
      .insert([{
        id,
        departure,
        destination,
        departure_time,
        duration: duration || '',
        driver: driver || '',
        price,
        image_url: image_url || null,
        active: true
      }])
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Désactiver un trajet
app.put('/api/admin/trips/:id/deactivate', async (req, res) => {
  try {
    const { error } = await supabase
      .from('trips')
      .update({ active: false })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier un trajet
app.put('/api/admin/trips/:id', async (req, res) => {
  const { departure_time, duration } = req.body;
  try {
    const { data, error } = await supabase
      .from('trips')
      .update({
        departure_time: departure_time || undefined,
        duration: duration || undefined,
        updated_at: new Date()
      })
      .eq('id', req.params.id)
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Journal de bord
app.get('/api/admin/journal', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id as reservation_id,
        customer_name,
        customer_phone,
        selected_seats,
        seats_count,
        status,
        travel_date,
        created_at,
        trip:trip_id (id, departure, destination, departure_time, driver)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un chauffeur
app.post('/api/admin/drivers', upload.single('photo'), async (req, res) => {
  const { name, phone, usual_route } = req.body;
  if (!name) return res.status(400).json({ error: 'Le nom est requis' });
  
  const photo_url = req.file ? `/images/drivers/${req.file.filename}` : null;
  try {
    const { data, error } = await supabase
      .from('drivers')
      .insert([{
        name,
        phone: phone || null,
        usual_route: usual_route || null,
        photo_url
      }])
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un client
app.post('/api/admin/customers', async (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) return res.status(400).json({ error: 'Nom et téléphone requis' });
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name, phone }])
      .select();
    
    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les clients
app.get('/api/admin/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ROUTES DES PAGES ----------
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

// Démarrage du serveur
app.listen(PORT, () => console.log(`✅ Serveur démarré sur le port ${PORT}`));