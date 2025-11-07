const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'coaches.json');

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(DATA_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read coaches from file
async function readCoaches() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

// Write coaches to file
async function writeCoaches(coaches) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(coaches, null, 2));
}

// GET /coaches - Get all coaches
app.get('/coaches', async (req, res) => {
  try {
    const coaches = await readCoaches();
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coaches' });
  }
});

// GET /coaches/:id - Get coach by ID
app.get('/coaches/:id', async (req, res) => {
  try {
    const coaches = await readCoaches();
    const coach = coaches.find(c => c.id === req.params.id);
    
    if (!coach) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    res.json(coach);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coach' });
  }
});

// POST /coaches - Create new coach
app.post('/coaches', async (req, res) => {
  try {
    const { name, email, category, rating, status } = req.body;
    
    // Validation
    if (!name || !email || !category || !rating || !status) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }
    
    const coaches = await readCoaches();
    
    // Check if email already exists
    if (coaches.some(c => c.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    const newCoach = {
      id: uuidv4(),
      name,
      email,
      category,
      rating: Number(rating),
      status,
      createdAt: new Date().toISOString()
    };
    
    coaches.push(newCoach);
    await writeCoaches(coaches);
    
    res.status(201).json(newCoach);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create coach' });
  }
});

// PUT /coaches/:id - Update coach
app.put('/coaches/:id', async (req, res) => {
  try {
    const { name, email, category, rating, status } = req.body;
    const coaches = await readCoaches();
    const index = coaches.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    // Validation
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    if (status && !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }
    
    // Check if email already exists (excluding current coach)
    if (email && coaches.some(c => c.email === email && c.id !== req.params.id)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Update coach
    coaches[index] = {
      ...coaches[index],
      ...(name && { name }),
      ...(email && { email }),
      ...(category && { category }),
      ...(rating !== undefined && { rating: Number(rating) }),
      ...(status && { status })
    };
    
    await writeCoaches(coaches);
    
    res.json(coaches[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update coach' });
  }
});

// DELETE /coaches/:id - Delete coach
app.delete('/coaches/:id', async (req, res) => {
  try {
    const coaches = await readCoaches();
    const filteredCoaches = coaches.filter(c => c.id !== req.params.id);
    
    if (coaches.length === filteredCoaches.length) {
      return res.status(404).json({ error: 'Coach not found' });
    }
    
    await writeCoaches(filteredCoaches);
    
    res.json({ message: 'Coach deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete coach' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

