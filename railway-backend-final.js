// FlightStat Bot 2025 - Railway Backend Server - CHATGPT HOTFIX
// API Proxy for FlightAware to bypass CORS restrictions
// SOLUTION: ISO Format Fix - Remove milliseconds from timestamps

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3001;

// ROBUST CORS CONFIGURATION - Final Fix (Cleaned Up)
const allowList = new Set([
  'https://out-p3pyuojgj-hakans-projects-96ef8546.vercel.app', // OLD Vercel URL
  'https://flightstat-fixed-fsct3i8kg-hakans-projects-96ef8546.vercel.app', // OLD Fixed URL
  'https://flightstat-fixed25-9a23nyepy-hakans-projects-96ef8546.vercel.app', // NEW Fixed URL - CORS FIX
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
    status: 'FlightStat Backend API is running! 🚀 CHATGPT HOTFIX - ISO Format Fix',
    version: '1.8.1',
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
    message: 'FlightStat Bot Railway Backend - CHATGPT HOTFIX',
    version: '1.8.1',
    fix: 'ISO format fix: removed milliseconds from timestamp (FlightAware compatibility)',
    endpoints: {
      health: '/health',
      flights: '/api/flights?airport=ICAO&user=username',
      debug: '/api/flights?airport=ICAO&user=username&debug=true'
    }
  });
});

// Arrivals endpoint (past flights)
app.get('/arrivals/:airport', async (req, res) => {
  const airport = req.params.airport.toUpperCase();
  const user = req.query.user || 'unknown';
  const key = process.env.AEROAPI_KEY;

  console.log(`🛩️  Arrivals Request: airport=${airport}, user=${user}`);

  if (!key) {
    return res.status(500).json({
      success: false,
      error: 'Server missing AEROAPI_KEY environment variable'
    });
  }

  const now = new Date();
  const startTime = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
  const endTime = now;
  
  const formatForFlightAware = (date) => {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };

  const flightAwareUrl = `https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/arrivals?start=${formatForFlightAware(startTime)}&end=${formatForFlightAware(endTime)}&max_pages=3`;
  
  try {
    const response = await fetch(flightAwareUrl, {
      headers: {
        'x-apikey': key,
        'Accept': 'application/json; charset=UTF-8',
        'User-Agent': 'FlightStat-Bot-2025/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ FlightAware API Error: ${response.status}`);
      return res.status(response.status).json({
        success: false,
        error: 'FlightAware API error',
        detail: errorData
      });
    }

    const data = await response.json();
    const processedFlights = (data.arrivals || [])
      .filter(flight => {
        const status = flight.status?.toLowerCase() || '';
        return status.includes('arrived') || status.includes('landed');
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
        progress_percent: 100,
        isMonitored: false,
        isNewOrUpdated: false
      }));

    console.log(`✅ Arrivals Success: ${processedFlights.length} flights for ${airport}`);

    return res.json({
      success: true,
      flights: processedFlights,
      airport: airport,
      timestamp: new Date().toISOString(),
      meta: {
        total: processedFlights.length,
        source: 'FlightAware API - Arrivals',
        user: user
      }
    });

  } catch (error) {
    console.error('💥 Arrivals Error:', error);
    return res.status(502).json({
      success: false,
      error: 'Network error',
      detail: error.message
    });
  }
});

// Scheduled arrivals endpoint (future flights)
app.get('/scheduled_arrivals/:airport', async (req, res) => {
  const airport = req.params.airport.toUpperCase();
  const user = req.query.user || 'unknown';
  const key = process.env.AEROAPI_KEY;

  console.log(`🛩️  Scheduled Arrivals Request: airport=${airport}, user=${user}`);

  if (!key) {
    return res.status(500).json({
      success: false,
      error: 'Server missing AEROAPI_KEY environment variable'
    });
  }

  const now = new Date();
  const startTime = now;
  const endTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
  
  const formatForFlightAware = (date) => {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };

  const flightAwareUrl = `https://aeroapi.flightaware.com/aeroapi/airports/${airport}/flights/arrivals?start=${formatForFlightAware(startTime)}&end=${formatForFlightAware(endTime)}&max_pages=3`;
  
  try {
    const response = await fetch(flightAwareUrl, {
      headers: {
        'x-apikey': key,
        'Accept': 'application/json; charset=UTF-8',
        'User-Agent': 'FlightStat-Bot-2025/1.0'
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ FlightAware API Error: ${response.status}`);
      return res.status(response.status).json({
        success: false,
        error: 'FlightAware API error',
        detail: errorData
      });
    }

    const data = await response.json();
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

    console.log(`✅ Scheduled Arrivals Success: ${processedFlights.length} flights for ${airport}`);

    return res.json({
      success: true,
      flights: processedFlights,
      airport: airport,
      timestamp: new Date().toISOString(),
      meta: {
        total: processedFlights.length,
        source: 'FlightAware API - Scheduled Arrivals',
        user: user
      }
    });

  } catch (error) {
    console.error('💥 Scheduled Arrivals Error:', error);
    return res.status(502).json({
      success: false,
      error: 'Network error',
      detail: error.message
    });
  }
});

// FlightAware API Proxy endpoint - CHATGPT HOTFIX (ISO Format Fix) - Legacy Support
app.get('/api/flights', async (req, res) => {
  const airport = (req.query.airport || '').toString().toUpperCase();
  const user = req.query.user || 'unknown';
  const key = process.env.AEROAPI_KEY;
  
  console.log(`🛩️  Flight Request: airport=${airport}, user=${user}, hasKey=${!!key}`);
  
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
  
  if (!airport) return res.status(400).json({ error: 'Missing airport' });
  if (!key) return res.status(500).json({ error: 'Missing AEROAPI_KEY' });

  const now = new Date();
  const wantStart = new Date(now.getTime() - 12*60*60*1000); // -12h
  const wantEnd   = new Date(now.getTime() + 12*60*60*1000); // +12h

  // ✨ 1) Fenster mathematisch korrekt machen (ChatGPT Hotfix)
  const clamp = (d) => new Date(Math.min(
    // +2 Tage: upper bound laut Spec
    now.getTime() + 2*24*60*60*1000,
    Math.max(
      // -10 Tage: lower bound laut Spec
      now.getTime() - 10*24*60*60*1000,
      d.getTime()
    )
  ));

  // Arrivals: end niemals in der Zukunft
  const arrStart = clamp(wantStart);
  const arrEnd   = clamp(now);        // ← capped at now

  // Scheduled Arrivals: Zukunft ab jetzt
  const schedStart = clamp(new Date(now)); // ab jetzt
  const schedEnd   = clamp(wantEnd);

  // ✨ 2) Start < End sicherstellen (sonst 400) + Format Fix
  const ensureOrder = (s, e) => (s < e) ? [s, e] : [new Date(e), new Date(new Date(e).getTime() + 60*1000)];
  const [aS, aE] = ensureOrder(arrStart, arrEnd);
  const [sS, sE] = ensureOrder(schedStart, schedEnd);
  
  // ✨ 3) FlightAware Format Fix - Remove milliseconds from ISO string
  const formatForFlightAware = (date) => {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };

  console.log(`🕐 Arrivals Range (Fixed): ${formatForFlightAware(aS)} to ${formatForFlightAware(aE)}`);
  console.log(`🕐 Scheduled Range (Fixed): ${formatForFlightAware(sS)} to ${formatForFlightAware(sE)}`);

  const base = 'https://aeroapi.flightaware.com/aeroapi';
  const H = { 'x-apikey': key, 'Accept': 'application/json; charset=UTF-8' };

  const urls = [
    `${base}/airports/${airport}/flights/arrivals?start=${formatForFlightAware(aS)}&end=${formatForFlightAware(aE)}&max_pages=3`,
    `${base}/airports/${airport}/flights/scheduled_arrivals?start=${formatForFlightAware(sS)}&end=${formatForFlightAware(sE)}&max_pages=3`
  ];

  console.log(`🌐 FlightAware Requests (Hotfix):`);
  console.log(`   Arrivals: ${urls[0]}`);
  console.log(`   Scheduled: ${urls[1]}`);

  // Hilfsleser für Fehlerkörper nach Spec: {title, reason, detail, status}
  const read = async (r) => {
    const txt = await r.text();
    try { return [r.status, JSON.parse(txt)]; } catch { return [r.status, { detail: txt }]; }
  };

  try {
    const [r1, r2] = await Promise.all(urls.map(u => fetch(u, { headers: H })));
    
    if (!r1.ok || !r2.ok) {
      const [s1,b1] = await read(r1);
      const [s2,b2] = await read(r2);
      // Gib den „schlimmeren" Status zurück und zeige BEIDE Bodies
      const pick = (s,b,u) => ({ endpoint: u, status: s, ...b });
      console.log(`❌ FlightAware Errors: ${s1}/${s2}`);
      console.log(`   Arrivals Error:`, b1);
      console.log(`   Scheduled Error:`, b2);
      return res.status(Math.max(s1,s2)).json({
        success: false,
        source: 'AeroAPI - CHATGPT HOTFIX v1.8.1',
        errors: [ pick(r1.status, b1, 'arrivals'), pick(r2.status, b2, 'scheduled_arrivals') ]
      });
    }
    
    const [arrivals, scheduled] = await Promise.all([r1.json(), r2.json()]);
    const arrived  = Array.isArray(arrivals?.arrivals) ? arrivals.arrivals : (arrivals?.flights || []);
    const future   = Array.isArray(scheduled?.scheduled_arrivals) ? scheduled.scheduled_arrivals : (scheduled?.flights || []);
    
    console.log(`📡 FlightAware Success: ${arrived.length} arrived + ${future.length} scheduled`);
    
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
          id: flight.fa_flight_id || `flight-${Math.random()}`,
          ident: flight.ident || 'N/A',
          callsign: flight.ident || 'N/A', 
          operator: flight.operator || 'Unknown',
          operator_iata: flight.operator_iata || 'XX',
          aircraft_type: flight.aircraft_type || 'N/A',
          registration: flight.registration || 'N/A',
          origin: {
            code: flight.origin?.code_iata || flight.origin?.code_icao || 'XXX',
            name: flight.origin?.name || 'Unknown Airport',
            city: flight.origin?.city || 'Unknown'
          },
          destination: {
            code: airport,
            name: 'Cologne Bonn Airport',
            city: 'Cologne'
          },
          scheduled_in: scheduledTime ? scheduledTime.toISOString() : null,
          estimated_in: estimatedTime ? estimatedTime.toISOString() : null,
          actual_in: actualTime ? actualTime.toISOString() : null,
          status: status,
          progress_percent: flight.progress_percent || (status === 'LANDED' ? 100 : 0),
          isMonitored: false,
          isNewOrUpdated: false
        };
      });
    };
    
    const arrivedFlights = processFlights(arrived, 'arrivals');
    const futureFlights = processFlights(future, 'scheduled');
    const allFlights = [...arrivedFlights, ...futureFlights];
    
    // FILTER: Only EN ROUTE flights (exclude LANDED)
    const flights = allFlights.filter(flight => 
      flight.status === 'EN ROUTE' || 
      flight.status === 'SCHEDULED' || 
      flight.status === 'DELAYED'
    );

    return res.json({ 
      success: true, 
      flights, 
      meta: {
        total: flights.length, 
        arrived: arrivedFlights.length,
        scheduled: futureFlights.length,
        airport, 
        source: 'AeroAPI (arrivals+scheduled_arrivals) - CHATGPT HOTFIX v1.8.1', 
        user,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (e) {
    console.error('💥 Server Error:', e);
    return res.status(502).json({ 
      success: false, 
      error: 'Upstream fetch failed', 
      detail: String(e),
      source: 'CHATGPT HOTFIX v1.8.1'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlightStat Backend running on port ${PORT}`);
  console.log(`🔑 API Key configured: ${!!process.env.AEROAPI_KEY}`);
  console.log(`🌐 CORS allowed origins: ${Array.from(allowList).join(', ')}`);
});