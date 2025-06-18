const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const multer = require('multer'); // ✅ 1. Add multer
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = 'mongodb+srv://Asmit:Asmit857@cluster0.riwaccd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// ✅ 2. Setup multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.static('public')); // HTML/CSS
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ✅ 3. Serve uploaded images

const client = new MongoClient(MONGO_URI);

async function run() {
  try {
    await client.connect();
    const db = client.db('wishdb');
    const wishes = db.collection('wishes');

    // ✅ 4. Modified POST: Save a wish + optional image
    app.post('/api/wishes', upload.single('image'), async (req, res) => {
      const { name, message, type } = req.body;
      if (!name || !message) return res.status(400).json({ error: 'Name and message are required' });

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const wishDoc = {
        name,
        message,
        type: type || 'General',
        createdAt: new Date(),
        image: imageUrl // ✅ Save image path in DB
      };

      const result = await wishes.insertOne(wishDoc);

      res.json({
        id: result.insertedId,
        link: `http://localhost:${PORT}/wish/${result.insertedId}`
      });
    });

    // GET: Retrieve wish by ID
    app.get('/api/wishes/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const wish = await wishes.findOne({ _id: new ObjectId(id) });
        if (!wish) return res.status(404).json({ error: 'Wish not found' });
        res.json({
  name: wish.name,
  type: wish.type,
  message: wish.message,
  createdAt: wish.createdAt,
  image: wish.image || null
});

      } catch (e) {
        res.status(400).json({ error: 'Invalid ID format' });
      }
    });

    // Serve wish.html for sharable pages
    app.get('/wish/:id', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'wish.html'));
    });

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
}

run();
