-- Mada-Brousse 2.0 — schéma PostgreSQL (compatible Supabase)
-- À exécuter une fois sur la base de données cible (psql, Supabase SQL editor, etc.)

CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(20) PRIMARY KEY,
  departure VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  departure_time VARCHAR(10),
  duration VARCHAR(20),
  driver VARCHAR(100),
  price NUMERIC(10,2) NOT NULL,
  image_url VARCHAR(255),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS occupied_seats (
  id SERIAL PRIMARY KEY,
  trip_id VARCHAR(20) NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(20) PRIMARY KEY,
  trip_id VARCHAR(20) NOT NULL REFERENCES trips(id),
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(30),
  customer_email VARCHAR(150),
  seats_count INTEGER NOT NULL,
  luggage INTEGER DEFAULT 0,
  selected_seats VARCHAR(100) NOT NULL,
  payment_method VARCHAR(30),
  total NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  insurance BOOLEAN DEFAULT false,
  promo_code VARCHAR(30),
  review INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS promos (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL, -- 'percent' ou 'fixed'
  value NUMERIC(10,2) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  usual_route VARCHAR(150),
  trips_completed INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 5.0,
  photo_url VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
