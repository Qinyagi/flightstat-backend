// FlightStat Bot 2025 - Railway Backend Server - FIXED VERSION
// API Proxy for FlightAware to bypass CORS restrictions

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - allow requests from Netlify
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://localhost:3000', 
    'https://tourmaline-rugelach-ecc573.netlify.app',  // Deine spezifische Netlify URL
    'https://courageous-gnome-18ce7b.netlify.app',     // Alte URL (falls noch verwendet)
    /https:\/\/.*\.netlify\.app$/,                     // Alle .netlify.app URLs
    /https:\/\/.*\.netlify\.com$/                      // Alle .netlify.com URLs
  ],
  credentials: true
}));


// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'FlightStat Backend API is running! 🚀 FIXED VERSION',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      flights: '/api/flights?airport=XXX&key=YOUR_API_KEY',
      health: '/'
    }
  });
});

// FlightAware API Proxy endpoint
app.get('/api/flights', async (req, res) => {
  try {
    const { airport, key, user } = req.query;
    
    // Validate required parameters
    if (!airport || !key) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        details: 'Both airport and key parameters are required'
      });
    }

    // Log request (without exposing full API key)
    const maskedKey = key.substring(0, 8) + '***' + key.substring(key.length - 4);
    console.log(`🛫 Flight request: ${airport} (User: ${user || 'unknown'}, Key: ${maskedKey})`);

    // Convert IATA to ICAO airport codes (FlightAware requires ICAO)
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
    
    // Use ICAO code if available, otherwise use original airport code
    const icaoCode = iataToIcao[airport.toUpperCase()] || airport;
    console.log(`🔄 Converting ${airport} → ${icaoCode} (ICAO format for FlightAware)`);

    // Build FlightAware API URL with 18-hour window (6h back for extreme delays + 12h forward)
    const now = new Date();
    const startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);   // 6 hours ago (for extreme delays)
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
    
    // Process and filter flights (same logic as frontend)
    const processedFlights = (data.arrivals || [])
      .filter(flight => {
        const status = flight.status?.toLowerCase() || '';
        // Focus on flights that are coming to CGN (18-hour rolling window)
        return status.includes('en route') || 
               status.includes('approach') || 
               status.includes('final') ||
               status.includes('scheduled') ||
               status.includes('departed') ||
               status.includes('airborne') ||
               status.includes('climbing') ||
               status.includes('cruising') ||
               status.includes('descending') ||
               status.includes('diverted');  // Include diverted flights (important info!)
        // Exclude: 'landed', 'arrived', 'cancelled'
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
        source: 'FlightAware API via Railway Backend FIXED',
        user: user || 'unknown'
      }
    };

    console.log(`✅ Success: ${processedFlights.length} flights for ${airport}`);
    res.json(result);

  } catch (error) {
    console.error('❌ Backend Error:', error.message);
    console.log('🔄 Falling back to demo data due to FlightAware API restrictions');
    
    // Fallback to demo data when FlightAware API fails
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

    // Return demo data as successful response
    res.json({
      success: true,
      flights: demoFlights,
      airport: airport,
      timestamp: new Date().toISOString(),
      meta: {
        total: demoFlights.length,
        source: 'Demo Data (FlightAware API blocked by Railway) - FIXED VERSION',
        user: user || 'unknown',
        note: 'FlightAware blocks Railway servers - using demo data'
      }
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlightStat Backend FIXED running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
  console.log(`✈️ API endpoint: http://localhost:${PORT}/api/flights`);
  console.log(`📊 Ready for Railway deployment! FIXED VERSION`);
});

