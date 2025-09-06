const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


const session = require('express-session');


app.use(cors({
  origin: 'http://127.0.0.1:5500', // SPECIFIČAN URL - ne *
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));


const provjeriAutentikaciju = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).send('Nije autorizirano');
  }
  next();
};

app.use(session({
  secret: 'secretBeyondFocus', // Promijeni u nešto sigurnije
  resave: false,           // Ne spremaj sesiju ako nije izmijenjena
  saveUninitialized: false, // Ne spremaj prazne sesije
  cookie: { 
    secure: false,         // Stavi na true kad koristiš HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 sata
  }
}));

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


app.get('/userdata', provjeriAutentikaciju, async (req, res) => {
  try {
    const korisnik = await Korisnik.findById(req.session.userId);
    if (!korisnik) return res.status(404).send('Korisnik ne postoji');
    
    res.send({
      id: korisnik._id,
      username: korisnik.username,
      coins: korisnik.coins,
      selectedCharacter: korisnik.selectedCharacter,
      ownedOutfits: korisnik.ownedOutfits
    });
  } catch (err) {
    res.status(500).send('Greška na serveru');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const korisnik = await Korisnik.findOne({ username });
    if (!korisnik) return res.status(400).send('Korisnik ne postoji');

    const isMatch = await bcrypt.compare(password, korisnik.password);
    if (!isMatch) return res.status(400).send('Pogrešna lozinka');

    // POSTAVI SESIJU
    req.session.userId = korisnik._id;
    req.session.username = korisnik.username;

    // VRATI PODATKE
    res.send({ 
      message: 'Prijava uspješna',
      korisnik: {  // KLJUČNO - mora biti "korisnik"!
        id: korisnik._id,
        username: korisnik.username,
        coins: korisnik.coins,
        selectedCharacter: korisnik.selectedCharacter,
        ownedOutfits: korisnik.ownedOutfits
      }
    });
  } catch (err) {
    res.status(500).send('Greška na serveru');
  }
});





app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Greška prilikom odjave');
    }
    res.clearCookie('connect.sid'); // Obriši session cookie
    res.send({ message: 'Odjava uspješna' });
  });
});


// Ostale postojeće rute (status, update-coins, buy-item) možeš ostaviti kako su


// Endpoint za mijenjanje odabranog lika
app.post('/update-character', provjeriAutentikaciju, async (req, res) => {
  const { selectedCharacter } = req.body;
  try {
    const korisnik = await Korisnik.findById(req.session.userId);
    if (!korisnik) return res.status(404).send('Korisnik ne postoji');
    
    korisnik.selectedCharacter = selectedCharacter;
    await korisnik.save();
    
    res.send({ message: 'Lik ažuriran', selectedCharacter: korisnik.selectedCharacter });
  } catch (err) {
    res.status(500).send('Greška na serveru');
  }
});

// Endpoint za kupovanje/dodavanje outfita
// U backend dodaj:
app.post('/buy-outfit', provjeriAutentikaciju, async (req, res) => {
  const { outfitName, price } = req.body;
  try {
    const korisnik = await Korisnik.findById(req.session.userId);
    if (!korisnik) return res.status(404).send('Korisnik ne postoji');
    
    // Provjeri ima li dovoljno kovanica
    if (korisnik.coins < price) {
      return res.status(400).send('Nedovoljno kovanica');
    }
    
    // Oduzmi kovanice i dodaj outfit
    korisnik.coins -= price;
    if (!korisnik.ownedOutfits.includes(outfitName)) {
      korisnik.ownedOutfits.push(outfitName);
    }
    
    await korisnik.save();
    
    res.send({ 
      message: 'Outfit kupljen', 
      coins: korisnik.coins,
      ownedOutfits: korisnik.ownedOutfits 
    });
  } catch (err) {
    res.status(500).send('Greška na serveru');
  }
});




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

module.exports = app;

if (require.main === module) {
  app.listen(3000);
}



