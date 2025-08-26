const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const mongoURI = 'mongodb+srv://rahi:euZh2Zb6@rahi.s2v4ein.mongodb.net/?retryWrites=true&w=majority&appName=Rahi';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB povezan'))
  .catch(err => console.error('MongoDB greška:', err));

const korisnikSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  coins: { type: Number, default: 0 },
  selectedCharacter: { type: String, default: '' },
  lastFocusTime: { type: Date, default: null },
  ownedOutfits: { type: [String], default: [] }
});

// Prije spremanja hashiraj lozinku
korisnikSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Korisnik = mongoose.model('Korisnik', korisnikSchema);

app.get('/', (req, res) => {
  res.send('Backend server radi');
});

app.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
      return res.status(400).send('Nedostaju podaci');

    let korisnik = await Korisnik.findOne({ $or: [{ email }, { username }] });
    if (korisnik) return res.status(400).send('Email ili username već postoji');

    korisnik = new Korisnik({ email, username, password, selectedCharacter: '' });
    await korisnik.save();
    res.send({ message: 'Korisnik uspješno kreiran', korisnik });
  } catch (err) {
    res.status(500).send('Greška na serveru');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).send('Nedostaju podaci');

    const korisnik = await Korisnik.findOne({ username });
    if (!korisnik) return res.status(400).send('Korisnik ne postoji');

    const isMatch = await bcrypt.compare(password, korisnik.password);
    if (!isMatch) return res.status(400).send('Pogrešna lozinka');

    res.send({ message: 'Prijava uspješna', korisnik });
  } catch (err) {
    res.status(500).send('Greška na serveru');
  }
});

// Ostale postojeće rute (status, update-coins, buy-item) možeš ostaviti kako su

app.post('/update-coins', async (req, res) => {
  const { korisnikId, coins } = req.body;
  if (!korisnikId || typeof coins !== 'number') return res.status(400).send({error: 'Nedostaju podaci'});
  try {
    const korisnik = await Korisnik.findById(korisnikId);
    if (!korisnik) return res.status(404).send({error: 'Korisnik nije pronađen'});
    korisnik.coins += coins;
    await korisnik.save();
    res.send({ message: 'Ažurirano', coins: korisnik.coins });
  } catch (err) {
    res.status(500).send({error: 'Greška na serveru'});
  }
});




app.listen(port, () => {
  console.log(`Server je pokrenut na http://localhost:${port}`);
});
