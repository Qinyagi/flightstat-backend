// FlightStat Bot 2025 - Railway Backend Server
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
    /https:\/\/.*\.netlify\.app$/,
    /https:\/\/.*\.netlify\.com$/
  ],
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'FlightStat Backend API is running! 🚀',
    version: '1.0.0',
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

    // Build FlightAware API URL
    const flightAwareUrl = `https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/arrivals?type=Airline&start=-4%20hours&end=%2B8%20hours&max_pages=3`;
    
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
        return status.includes('en route') || 
               status.includes('approach') || 
               status.includes('final') ||
               status.includes('landing') ||
               status.includes('arrived');
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
        source: 'FlightAware API via Railway Backend',
        user: user || 'unknown'
      }
    };

    console.log(`✅ Success: ${processedFlights.length} flights for ${airport}`);
    res.json(result);

  } catch (error) {
    console.error('❌ Backend Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Railway Backend API error - check server logs',
      timestamp: new Date().toISOString()
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
  console.log(`🚀 FlightStat Backend running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/`);
  console.log(`✈️ API endpoint: http://localhost:${PORT}/api/flights`);
  console.log(`📊 Ready for Railway deployment!`);

});
