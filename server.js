// FlightStat Bot 2025 - Railway Backend Server - CHATGPT CORS FIX V2
// API Proxy for FlightAware to bypass CORS restrictions

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// ROBUST CORS CONFIGURATION - ChatGPT Fix V2
const allowList = new Set([
  'https://genuine-treacle-94862a.netlify.app',
  'https://sensational-entremet-00d330.netlify.app',
  'https://gentle-starship-f7e194.netlify.app',
  'https://grand-nasturtium-d134ae.netlify.app',
  'https://tourmaline-rugelach-ecc573.netlify.app',
  'https://courageous-gnome-18ce7b.netlify.app',
  'http://localhost:3000',
  'https://localhost:3000'
]);

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return allowList.has(origin) || /\.netlify\.app$/.test(u.host);
  } catch { return false; }
};

const corsOptionsDelegate = (req, cb) => {
  const origin = req.header('Origin') || '';
  const allowed = isAllowedOrigin(origin);
  cb(null, {
    origin: allowed,                // true/false -> cors spiegelt Origin automatisch
    credentials: false,             // keine Cookies nötig
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    // WICHTIG: allowedHeaders WEG LASSEN -> cors spiegelt Access-Control-Request-Headers
    maxAge: 86400,
  });
};

// Preflight zuerst
app.options('*', cors(corsOptionsDelegate));

// Global aktivieren
app.use(cors(corsOptionsDelegate));

// Vary: Origin für Proxies
app.use((req, res, next) => {
  if (req.headers.origin) res.set('Vary', 'Origin');
  next();
});

// Parse JSON bodies
app.use(express.json());

// ICAO Mapping
const iataToIcao = {
  'CGN': 'EDDK',  // Cologne/Bonn
  'FRA': 'EDDF',  // Frankfurt
  'MUC': 'EDDM',  // Munich
  'DUS': 'EDDL',  // Düsseldorf
  'HAM': 'EDDH',  // Hamburg
  'BER': 'EDDB',  // Berlin Brandenburg
  'STR': 'EDDS',  // Stuttgart
  'NUE': 'EDDN',  // Nuremberg
  'HAJ': 'EDDV',  // Hannover
  'BRE': 'EDDW',  // Bremen
  'JFK': 'KJFK',  // New York JFK
  'LAX': 'KLAX',  // Los Angeles
  'LHR': 'EGLL',  // London Heathrow
  'CDG': 'LFPG',  // Paris Charles de Gaulle
  'AMS': 'EHAM',  // Amsterdam
  'ZUR': 'LSZH',  // Zurich
  'VIE': 'LOWW',  // Vienna
  'FCO': 'LIRF',  // Rome Fiumicino
  'MAD': 'LEMD',  // Madrid
  'BCN': 'LEBL'   // Barcelona
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'FlightStat Backend API is running! 🚀 CHATGPT CORS FIX V2',
    version: '1.4.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      flights: '/api/flights?airport=XXX&key=YOUR_API_KEY',
      health: '/'
    }
  });
});

// FlightAware API Proxy endpoint
app.get('/api/flights', async (req, res, next) => {
  try {
    const airport = (req.query.airport || '').toString().toUpperCase();
    const key = req.query.key; // In production: process.env.FLIGHTAWARE_API_KEY
    const user = req.query.user || 'unknown';
    
    // Validate required parameters
    if (!airport) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'Airport parameter is required'
      });
    }

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Missing API key',
        details: 'FlightAware API key is required'
      });
    }

    // Convert IATA to ICAO
    const icaoCode = iataToIcao[airport] || airport;
    console.log(`🔄 Converting ${airport} → ${icaoCode} (ICAO format for FlightAware)`);

    // Log request (without exposing full API key)
    const maskedKey = key.substring(0, 8) + '***' + key.substring(key.length - 4);
    console.log(`🛫 Flight request: ${airport} (User: ${user}, Key: ${maskedKey})`);

    // Build FlightAware API URL
    const now = new Date();
    const startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);   // 6 hours ago
    const endTime = new Date(now.getTime() + 12 * 60 * 60 * 1000);    // 12 hours from now
    
    const flightAwareUrl = `https://aeroapi.flightaware.com/aeroapi/airports/${icaoCode}/flights/arrivals?start=${startTime.toISOString()}&end=${endTime.toISOString()}&max_pages=3`;
    
    // Make request to FlightAware API
    const response = await fetch(flightAwareUrl, {
      headers: {
        'x-apikey': key,
        'Accept': 'application/json; charset=UTF-8',
        'User-Agent': 'FlightStat-Bot-2025/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`FlightAware API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process flights
    const processedFlights = (data.arrivals || [])
      .filter(flight => {
        const status = flight.status?.toLowerCase() || '';
        return status.includes('en route') || 
               status.includes('approach') || 
               status.includes('final') ||
               status.includes('scheduled') ||
               status.includes('departed') ||
               status.includes('airborne') ||
               status.includes('climbing') ||
               status.includes('cruising') ||
               status.includes('descending') ||
               status.includes('diverted');
      })
      .slice(0, 50)
      .map((flight, index) => ({
        id: flight.fa_flight_id || `flight-${index}`,
        ident: flight.ident || 'Unknown',
        callsign: flight.ident || 'Unknown',
        registration: flight.registration || 'N/A',
        aircraft_type: flight.aircraft_type || 'Unknown',
        operator: flight.operator || 'Unknown',
        operator_iata: flight.operator_iata || 'XX',
        origin: {
          code: flight.origin?.code_iata || flight.origin?.code_icao || 'XXX',
          name: flight.origin?.name || 'Unknown Airport',
          city: flight.origin?.city || 'Unknown'
        },
        scheduled_in: flight.scheduled_in,
        estimated_in: flight.estimated_in,
        actual_in: flight.actual_in,
        status: flight.status || 'Unknown',
        progress_percent: flight.progress_percent || 0,
        isMonitored: false,
        isNewOrUpdated: false
      }));

    // Success response
    const result = {
      success: true,
      flights: processedFlights,
      airport: airport,
      timestamp: new Date().toISOString(),
      meta: {
        total: processedFlights.length,
        source: 'FlightAware API via Railway Backend CHATGPT FIX V2',
        user: user
      }
    };

    console.log(`✅ Success: ${processedFlights.length} flights for ${airport}`);
    res.json(result);

  } catch (error) {
    next(error); // Let error handler deal with it
  }
});

// Fehler-Handler NACH allen Routen
app.use((err, req, res, next) => {
  const origin = req.header('Origin');
  if (isAllowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    // KEIN Access-Control-Allow-Credentials hier setzen (nur wenn true nötig ist)
  }
  
  console.error('❌ Backend Error:', err.message);
  
  const demoFlights = [
    {
      id: 'demo-1',
      ident: 'LH441',
      callsign: 'DLH441',
      registration: 'D-AIXA',
      aircraft_type: 'A350-900',
      operator: 'DLH',
      operator_iata: 'LH',
      origin: { code: 'KJFK', name: 'John F. Kennedy International', city: 'New York' },
      scheduled_in: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      estimated_in: new Date(Date.now() + 2.25 * 60 * 60 * 1000).toISOString(),
      status: 'En Route',
      progress_percent: 75,
      isMonitored: false,
      isNewOrUpdated: true
    },
    {
      id: 'demo-2',
      ident: 'UA789',
      callsign: 'UAL789',
      registration: 'N12345',
      aircraft_type: 'B787-9',
      operator: 'UAL',
      operator_iata: 'UA',
      origin: { code: 'KSFO', name: 'San Francisco International', city: 'San Francisco' },
      scheduled_in: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      estimated_in: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
      status: 'En Route',
      progress_percent: 85,
      isMonitored: false,
      isNewOrUpdated: false
    },
    {
      id: 'demo-3',
      ident: 'EW123',
      callsign: 'EWG123',
      registration: 'D-CGNE',
      aircraft_type: 'A320-200',
      operator: 'EWG',
      operator_iata: 'EW',
      origin: { code: 'LEPA', name: 'Palma de Mallorca', city: 'Palma' },
      scheduled_in: new Date(Date.now() + 0.5 * 60 * 60 * 1000).toISOString(),
      estimated_in: new Date(Date.now() + 0.75 * 60 * 60 * 1000).toISOString(),
      status: 'Approach',
      progress_percent: 95,
      isMonitored: false,
      isNewOrUpdated: true
    }
  ];

  res.status(err.status || 500).json({
    success: true, // Return as success with demo data
    flights: demoFlights,
    airport: req.query.airport || 'CGN',
    timestamp: new Date().toISOString(),
    meta: {
      total: demoFlights.length,
      source: 'Demo Data (FlightAware API error) - CHATGPT FIX V2',
      user: req.query.user || 'unknown',
      note: 'Using demo data due to API error'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlightStat Backend CHATGPT CORS FIX V2 running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
  console.log(`✈️ API endpoint: http://localhost:${PORT}/api/flights`);
  console.log(`📊 Ready for Railway deployment! CHATGPT FIX V2`);
});
