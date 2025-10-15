-- 1. Aktiivsete kasutajate loetelu koos rolliga
-- Eesmärk: Näitab kõiki aktiivseid kasutajaid ja nende rolle. Kasulik adminile kasutajate haldamiseks.
-- Oodatav tulemus: Tabel, kus iga rida on aktiivne kasutaja koos rolliga.
SELECT username AS kasutajanimi, email AS email, role AS roll
FROM users
WHERE is_active = 1
ORDER BY role, username;

-- 2. Kõige kallimad sõidukid (TOP 5)
-- Eesmärk: Näitab 5 kõige kallimat sõidukit, koos margi ja mudeliga. Kasulik turuanalüüsiks või reklaamiks.
-- Oodatav tulemus: Tabel, kus iga rida on sõiduk, margi ja mudeli nimega, hinnaga.
SELECT v.id AS vehicle_id, mks.name AS mark, mdl.name AS mudel, v.price AS hind, v.year AS aasta
FROM vehicles v
INNER JOIN models mdl ON v.model_id = mdl.id
INNER JOIN makes mks ON mdl.make_id = mks.id
ORDER BY v.price DESC
LIMIT 5;

-- 3. Sõidukite arv margi kaupa
-- Eesmärk: Näitab, kui palju sõidukeid on igal margil. Kasulik varude ja turu ülevaateks.
-- Oodatav tulemus: Tabel, kus iga rida on mark ja selle sõidukite arv.
SELECT mks.name AS mark, COUNT(v.id) AS vehicle_count
FROM makes mks
LEFT JOIN models mdl ON mks.id = mdl.make_id
LEFT JOIN vehicles v ON mdl.id = v.model_id
GROUP BY mks.id, mks.name
ORDER BY vehicle_count DESC;

-- 4. Kasutajad, kellel on rohkem kui 3 sõidukit
-- Eesmärk: Leiab aktiivsed müüjad, kellel on rohkem kui 3 sõidukit. Kasulik adminile aktiivsete müüjate leidmiseks.
-- Oodatav tulemus: Tabel, kus iga rida on kasutaja ja tema sõidukite arv.
SELECT u.username AS kasutajanimi, u.email AS email, COUNT(v.id) AS vehicle_count
FROM users u
INNER JOIN vehicles v ON u.id = v.user_id
GROUP BY u.id, u.username, u.email
HAVING COUNT(v.id) > 3
ORDER BY vehicle_count DESC;

-- 5. Sõidukite keskmine hind kütuse tüübi kaupa
-- Eesmärk: Näitab, milline kütuse tüüp on keskmiselt kõige kallim. Kasulik turuanalüüsiks.
-- Oodatav tulemus: Tabel, kus iga rida on kütuse tüüp ja selle keskmine hind.
SELECT fuel_type AS kytuse_tuup, AVG(price) AS keskmine_hind, COUNT(id) AS vehicle_count
FROM vehicles
WHERE fuel_type IS NOT NULL
GROUP BY fuel_type
ORDER BY keskmine_hind DESC;

-- 6. Sõidukid, millel puudub kaanepilt
-- Eesmärk: Leiab sõidukid, millel pole kaanepilti. Kasulik moderaatorile, et täiendada kuulutusi.
-- Oodatav tulemus: Tabel, kus iga rida on sõiduk, margi ja mudeli nimega, millel pole kaanepilti.
SELECT v.id AS vehicle_id, mks.name AS mark, mdl.name AS mudel, v.year AS aasta
FROM vehicles v
INNER JOIN models mdl ON v.model_id = mdl.id
INNER JOIN makes mks ON mdl.make_id = mks.id
LEFT JOIN vehicle_images vi ON v.id = vi.vehicle_id AND vi.is_cover = 1
WHERE vi.id IS NULL
ORDER BY v.year DESC;
