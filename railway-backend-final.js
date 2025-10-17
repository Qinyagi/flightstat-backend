// FlightStat Bot 2025 - Railway Backend Server - FINAL CHATGPT 5 FIX
// API Proxy for FlightAware to bypass CORS restrictions

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// ROBUST CORS CONFIGURATION - Final Fix (Cleaned Up)
const allowList = new Set([
  'https://remarkable-bubblegum-9bae5e.netlify.app', // Current Netlify URL
  'http://localhost:3000',
  'https://localhost:3000'
]);

const corsOptionsDelegate = (req, cb) => {
  const origin = req.header('Origin') || '';
  
  console.log(`🌐 CORS Check: Origin="${origin}"`);
  
  let corsOptions;
  if (allowList.has(origin)) {
    console.log(`✅ CORS: Origin "${origin}" is allowed`);
    corsOptions = { 
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-apikey']
    };
  } else {
    console.log(`❌ CORS: Origin "${origin}" is NOT allowed`);
    corsOptions = { origin: false };
  }
  
  cb(null, corsOptions);
};

// Apply CORS middleware
app.use(cors(corsOptionsDelegate));

// Middleware for parsing JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'FlightStat Backend API is running! 🚀 CHATGPT 5 FINAL FIX',
    version: '1.6.0',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiKey: !!process.env.AEROAPI_KEY,
      port: PORT
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'FlightStat Bot Railway Backend - CHATGPT 5 FINAL FIX',
    version: '1.6.0',
    endpoints: {
      health: '/health',
      flights: '/api/flights?airport=ICAO&user=username'
    }
  });
});

// FlightAware API Proxy endpoint - CHATGPT 5 FINAL FIX
app.get('/api/flights', async (req, res) => {
  const airport = (req.query.airport || '').toString().toUpperCase();
  const user = req.query.user || 'unknown';
  const key = process.env.AEROAPI_KEY; // ← Secret from Railway Environment
  
  console.log(`🛩️  Flight Request: airport=${airport}, user=${user}, hasKey=${!!key}`);
  console.log(`🔍 DEBUG: req.query =`, req.query);
  console.log(`🔍 DEBUG: airport length = ${airport.length}`);
  
  // DEBUG: Return debug info first
  if (req.query.debug === 'true') {
    return res.json({
      debug: true,
      airport: airport,
      user: user,
      hasKey: !!key,
      query: req.query,
      airportLength: airport.length
    });
  }
  
  // Validate required parameters
  if (!airport) {
    console.log('❌ Missing airport parameter');
    return res.status(400).json({
      error: 'Missing required parameter: airport (ICAO code)',
      example: '/api/flights?airport=EDDK&user=testuser',
      received: {
        airport: airport,
        query: req.query
      }
    });
  }

  if (!key) {
    console.log('❌ Missing AEROAPI_KEY environment variable');
    return res.status(500).json({
      error: 'Server configuration error: Missing FlightAware API key',
      message: 'AEROAPI_KEY environment variable not set'
    });
  }

  try {
    // Calculate time range (last 12 hours to next 12 hours)
    const now = new Date();
    const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
    
    const startTime = start.toISOString();
    const endTime = end.toISOString();
    
    console.log(`🕐 Time Range: ${startTime} to ${endTime}`);
    
    // FlightAware AeroAPI v4 endpoint
    const flightAwareUrl = `https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/arrivals?start=${startTime}&end=${endTime}`;
    
    console.log(`🌐 FlightAware Request: ${flightAwareUrl}`);
    
    const response = await fetch(flightAwareUrl, {
      method: 'GET',
      headers: {
        'x-apikey': key,
        'Accept': 'application/json'
      }
    });

    console.log(`📡 FlightAware Response: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ FlightAware Error: ${errorText}`);
      
      // Pass through the actual FlightAware error instead of masking as 500
      return res.status(response.status).json({
        error: 'FlightAware API Error',
        status: response.status,
        message: errorText,
        source: 'FlightAware API via Railway Backend CHATGPT 5 FINAL FIX'
      });
    }

    const data = await response.json();
    console.log(`✅ FlightAware Success: ${data.arrivals?.length || 0} flights received`);
    
    // Process and format the flight data
    const processedFlights = (data.arrivals || []).map(flight => {
      const scheduledTime = flight.scheduled_in ? new Date(flight.scheduled_in) : null;
      const actualTime = flight.actual_in ? new Date(flight.actual_in) : null;
      const estimatedTime = flight.estimated_in ? new Date(flight.estimated_in) : null;
      
      // Determine flight status
      let status = 'UNKNOWN';
      if (actualTime) {
        status = 'LANDED';
      } else if (estimatedTime) {
        const now = new Date();
        if (estimatedTime > now) {
          status = 'EN ROUTE';
        } else {
          status = 'DELAYED';
        }
      } else if (scheduledTime) {
        const now = new Date();
        if (scheduledTime > now) {
          status = 'SCHEDULED';
        } else {
          status = 'DELAYED';
        }
      }
      
      return {
        flight: flight.ident || 'N/A',
        airline: flight.operator || 'Unknown',
        origin: flight.origin?.code || 'N/A',
        destination: flight.destination?.code || airport,
        scheduled: scheduledTime ? scheduledTime.toISOString() : null,
        estimated: estimatedTime ? estimatedTime.toISOString() : null,
        actual: actualTime ? actualTime.toISOString() : null,
        status: status,
        aircraft: flight.aircraft_type || 'N/A'
      };
    });

    // Return formatted response
    res.json({
      flights: processedFlights,
      meta: {
        total: processedFlights.length,
        source: 'FlightAware API via Railway Backend CHATGPT 5 FINAL FIX',
        airport: airport,
        user: user,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Server Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      source: 'Railway Backend CHATGPT 5 FINAL FIX'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlightStat Backend running on port ${PORT}`);
  console.log(`🔑 API Key configured: ${!!process.env.AEROAPI_KEY}`);
  console.log(`🌐 CORS allowed origins: ${Array.from(allowList).join(', ')}`);
});