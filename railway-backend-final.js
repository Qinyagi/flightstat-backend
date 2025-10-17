// FlightStat Bot 2025 - Railway Backend Server - CHATGPT ULTIMATE FIX
// API Proxy for FlightAware to bypass CORS restrictions
// SOLUTION: Dual endpoint approach (arrivals + scheduled_arrivals)

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
    status: 'FlightStat Backend API is running! 🚀 CHATGPT ULTIMATE FIX - Dual Endpoint Solution',
    version: '1.7.0',
    timestamp: new Date().toISOString(),
    environment: {
      hasApiKey: !!process.env.AEROAPI_KEY,
      port: PORT
    },
    endpoints: {
      arrivals: 'Past flights (landed)',
      scheduled_arrivals: 'Future flights (en route)'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'FlightStat Bot Railway Backend - CHATGPT ULTIMATE FIX',
    version: '1.7.0',
    fix: 'Dual endpoint solution: arrivals (past) + scheduled_arrivals (future)',
    endpoints: {
      health: '/health',
      flights: '/api/flights?airport=ICAO&user=username',
      debug: '/api/flights?airport=ICAO&user=username&debug=true'
    }
  });
});

// FlightAware API Proxy endpoint - CHATGPT ULTIMATE FIX
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
    const now = new Date();
    // Split time windows correctly per ChatGPT recommendation
    const wantStart = new Date(now.getTime() - 12 * 60 * 60 * 1000); // -12h
    const wantEnd = new Date(now.getTime() + 12 * 60 * 60 * 1000);   // +12h
    
    // Part A: actual arrivals (past flights) - end capped at now
    const arrStart = wantStart;
    const arrEnd = now; // CRITICAL: never future for arrivals endpoint
    
    // Part B: scheduled arrivals (future flights) - from now onwards
    const schedStart = now;
    const schedEnd = wantEnd;
    
    console.log(`🕐 Arrivals Range: ${arrStart.toISOString()} to ${arrEnd.toISOString()}`);
    console.log(`🕐 Scheduled Range: ${schedStart.toISOString()} to ${schedEnd.toISOString()}`);
    
    const base = 'https://aeroapi.flightaware.com/aeroapi';
    const headers = { 
      'x-apikey': key, 
      'Accept': 'application/json; charset=UTF-8' 
    };
    
    // Two separate API calls as recommended by ChatGPT
    const urls = [
      `${base}/airports/${airport}/flights/arrivals?start=${arrStart.toISOString()}&end=${arrEnd.toISOString()}&max_pages=3`,
      `${base}/airports/${airport}/flights/scheduled_arrivals?start=${schedStart.toISOString()}&end=${schedEnd.toISOString()}&max_pages=3`
    ];
    
    console.log(`🌐 FlightAware Requests:`);
    console.log(`   Arrivals: ${urls[0]}`);
    console.log(`   Scheduled: ${urls[1]}`);
    
    const [r1, r2] = await Promise.all(urls.map(u => fetch(u, { headers })));
    
    // Handle errors transparently as recommended
    const pick = async (r) => {
      if (r.ok) {
        return r.json();
      } else {
        const errorBody = await r.text();
        throw { status: r.status, body: errorBody };
      }
    };
    
    const [arrivals, scheduled] = await Promise.all([pick(r1), pick(r2)]);
    
    console.log(`📡 FlightAware Responses:`);
    console.log(`   Arrivals: ${arrivals?.arrivals?.length || 0} flights`);
    console.log(`   Scheduled: ${scheduled?.scheduled_arrivals?.length || 0} flights`);
    
    // Extract flights from API responses
    const arrived = Array.isArray(arrivals?.arrivals) ? arrivals.arrivals : (arrivals?.flights || []);
    const future = Array.isArray(scheduled?.scheduled_arrivals) ? scheduled.scheduled_arrivals : (scheduled?.flights || []);
    
    // Process and format all flight data
    const processFlights = (flights, type) => {
      return flights.map(flight => {
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
          aircraft: flight.aircraft_type || 'N/A',
          type: type // Track which endpoint this came from
        };
      });
    };
    
    const arrivedFlights = processFlights(arrived, 'arrivals');
    const futureFlights = processFlights(future, 'scheduled');
    const allFlights = [...arrivedFlights, ...futureFlights];
    
    console.log(`✅ FlightAware Success: ${allFlights.length} total flights (${arrivedFlights.length} arrived + ${futureFlights.length} scheduled)`);
    
    // Return formatted response
    res.json({
      success: true,
      flights: allFlights,
      meta: {
        total: allFlights.length,
        arrived: arrivedFlights.length,
        scheduled: futureFlights.length,
        source: 'AeroAPI (arrivals + scheduled_arrivals) - CHATGPT ULTIMATE FIX',
        airport: airport,
        user: user,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Server Error:', error);
    
    // Pass through upstream errors with original status
    const status = error?.status || 502;
    res.status(status).json({
      success: false,
      source: 'AeroAPI',
      status: status,
      message: error?.body || String(error),
      airport: airport,
      user: user,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlightStat Backend running on port ${PORT}`);
  console.log(`🔑 API Key configured: ${!!process.env.AEROAPI_KEY}`);
  console.log(`🌐 CORS allowed origins: ${Array.from(allowList).join(', ')}`);
});