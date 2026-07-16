-- Mada-Brousse 2.0 — migration additive (à exécuter sur une base déjà existante)
-- Sans danger : n'écrase aucune donnée, ajoute seulement ce qui manque.

-- Les sièges deviennent alphanumériques (ex: "C1", "A2") au lieu de numériques
ALTER TABLE occupied_seats ALTER COLUMN seat_number TYPE VARCHAR(10) USING seat_number::VARCHAR;

-- Nouveau statut par défaut : une réservation client démarre "en attente" de confirmation admin
ALTER TABLE reservations ALTER COLUMN status SET DEFAULT 'pending';

-- Date de voyage choisie par le client (réservation à l'avance)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS travel_date DATE;

-- Messagerie : notifications envoyées au client (ex. confirmation de réservation)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  reservation_id VARCHAR(20) NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  customer_phone VARCHAR(30),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Heure d'arrivée / horaires modifiables plus finement par trajet
ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
