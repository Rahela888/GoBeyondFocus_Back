const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3500;



app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3500', 'http://127.0.0.1:5500', 'http://localhost:5500', 'go-beyond-focus-front.vercel.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'user-id']
}));


app.use(session({
  secret: 'secretBeyondFocus',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // ✅ Dinamicki postavlja HTTPS
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true, // ✅ Sigurniji
    sameSite: 'lax' // ✅ Za cross-domain requests
  }
}));


const mongoURI = 'mongodb+srv://rahi:euZh2Zb6@rahi.s2v4ein.mongodb.net/?retryWrites=true&w=majority&appName=Rahi';
mongoose.connect(mongoURI)
  .then(() => console.log('MongoDB povezan'))
  .catch(err => console.error('MongoDB greška:', err));


const korisnikSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  coins: { type: Number, default: 0 },
  selectedCharacter: { type: String, default: '' },
  ownedOutfits: { type: [String], default: [] },
  focusStartTime: { type: Date, default: null },
  focusDuration: { type: Number, default: 0 },
  isInFocus: { type: Boolean, default: false }
});

app.get('/userdata', provjeriAutentikaciju, async (req, res) => {
  try {
    const korisnik = await Korisnik.findById(req.userId);
    if (!korisnik) {
      return res.status(404).send('User not found');
    }
    
    res.send({
      id: korisnik._id,
      username: korisnik.username,
      coins: korisnik.coins,
      selectedCharacter: korisnik.selectedCharacter,
      ownedOutfits: korisnik.ownedOutfits
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});


korisnikSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const Korisnik = mongoose.model('Korisnik', korisnikSchema);

const provjeriAutentikaciju = (req, res, next) => {
  const korisnikId = req.headers['user-id'];
  if (!korisnikId) return res.status(401).send('Nije autorizirano');
  req.userId = korisnikId;
  next();
};

app.get('/', (req, res) => {
  res.send('Backend radi');
});

app.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).send('Nedostaju podaci');

    const postojeci = await Korisnik.findOne({ $or: [{ email }, { username }] });
    if (postojeci) return res.status(400).send('Korisnik već postoji');

    const korisnik = new Korisnik({ email, username, password });
    await korisnik.save();
    
    res.send({ message: 'Uspješno registriran', korisnik: { id: korisnik._id, username, coins: 0 } });
  } catch (err) {
    res.status(500).send('Greška');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const korisnik = await Korisnik.findOne({ username });
    if (!korisnik) return res.status(400).send('Korisnik ne postoji');

    const isMatch = await bcrypt.compare(password, korisnik.password);
    if (!isMatch) return res.status(400).send('Pogrešna lozinka');

    res.send({ 
      message: 'Uspješna prijava',
      korisnik: {
        id: korisnik._id,
        username: korisnik.username,
        coins: korisnik.coins,
        selectedCharacter: korisnik.selectedCharacter,
        ownedOutfits: korisnik.ownedOutfits
      }
    });
  } catch (err) {
    res.status(500).send('Greška');
  }
});


app.post('/start-focus', async (req, res) => {
  console.log('Received start-focus request');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    const { minutes } = req.body;
    if (!minutes || minutes <= 0) {
      return res.status(400).send('Invalid duration');
    }

    console.log(`Starting focus for user ${userId}, duration: ${minutes} minutes`);

    const korisnik = await Korisnik.findById(userId);
    if (!korisnik) {
      return res.status(404).send('User not found');
    }

    // Spremi fokus podatke
    korisnik.focusStartTime = new Date();
    korisnik.focusDuration = minutes;
    korisnik.isInFocus = true;
    await korisnik.save();

    res.send({ 
      message: 'Focus started successfully',
      startTime: korisnik.focusStartTime,
      duration: minutes
    });

  } catch (err) {
    console.error('Start focus error:', err);
    res.status(500).send('Server error');
  }
});


app.post('/end-focus', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    const korisnik = await Korisnik.findById(userId);
    if (!korisnik) {
      return res.status(404).send('User not found');
    }

    if (!korisnik.isInFocus || !korisnik.focusStartTime) {
      return res.status(400).send('No active focus session');
    }

    // Izračunaj stvarno vrijeme
    const endTime = new Date();
    const elapsedMs = endTime - korisnik.focusStartTime;
    const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));


    const periodsOf30Min = Math.floor(elapsedMinutes / 30);
    const coinsEarned = periodsOf30Min * 5;

 
    korisnik.coins += coinsEarned;
    korisnik.isInFocus = false;
    korisnik.focusStartTime = null;
    korisnik.focusDuration = 0;
    await korisnik.save();

    console.log(`Focus ended for user ${userId}. Time: ${elapsedMinutes}min, Coins: ${coinsEarned}`);

    res.send({
      message: 'Focus session completed',
      timeSpent: elapsedMinutes,
      coinsEarned: coinsEarned,
      totalCoins: korisnik.coins
    });

  } catch (err) {
    console.error('End focus error:', err);
    res.status(500).send('Server error');
  }
});


app.get('/focus-status', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    if (!userId) {
      return res.status(401).send('Unauthorized');
    }

    const korisnik = await Korisnik.findById(userId);
    if (!korisnik) {
      return res.status(404).send('User not found');
    }

    if (!korisnik.isInFocus) {
      return res.send({ 
        inFocus: false,
        message: 'No active focus session'
      });
    }

  
    const now = new Date();
    const elapsedMinutes = Math.floor((now - korisnik.focusStartTime) / (1000 * 60));
    const remainingMinutes = Math.max(0, korisnik.focusDuration - elapsedMinutes);

    res.send({
      inFocus: true,
      remainingMinutes: remainingMinutes,
      elapsedMinutes: elapsedMinutes,
      totalDuration: korisnik.focusDuration
    });

  } catch (err) {
    console.error('Focus status error:', err);
    res.status(500).send('Server error');
  }
});


app.post('/update-character', provjeriAutentikaciju, async (req, res) => {
  try {
    const { selectedCharacter } = req.body;
    const korisnik = await Korisnik.findById(req.userId);
    korisnik.selectedCharacter = selectedCharacter;
    await korisnik.save();
    res.send({ message: 'Lik ažuriran' });
  } catch (err) {
    res.status(500).send('Greška');
  }
});


app.post('/update-coins', async (req, res) => {
  try {
    const { korisnikId, coins } = req.body;
    const korisnik = await Korisnik.findById(korisnikId);
    if (!korisnik) return res.status(404).send('User not found');
    
    korisnik.coins += coins;
    await korisnik.save();
    
    res.send({ coins: korisnik.coins });
  } catch (err) {
    res.status(500).send('Server error');
  }
});


app.post('/buy-outfit', provjeriAutentikaciju, async (req, res) => {
  try {
    const { outfitName, price } = req.body;
    const korisnik = await Korisnik.findById(req.userId);
    
    if (korisnik.coins < price) return res.status(400).send('Nedovoljno kovanica');
    
    korisnik.coins -= price;
    korisnik.ownedOutfits.push(outfitName);
    await korisnik.save();
    
    res.send({ message: 'Outfit kupljen', coins: korisnik.coins });
  } catch (err) {
    res.status(500).send('Greška');
  }
});


module.exports = app;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server na http://localhost:${port}`);
  });
}










