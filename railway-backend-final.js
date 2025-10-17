// FlightStat Bot 2025 - Railway Backend Server - CHATGPT HOTFIX
// API Proxy for FlightAware to bypass CORS restrictions
// SOLUTION: Time window validation + AeroAPI spec compliance

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
    status: 'FlightStat Backend API is running! 🚀 CHATGPT HOTFIX - Time Window Validation',
    version: '1.8.0',
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
    version: '1.8.0',
    fix: 'Time window validation: proper start<end ordering + AeroAPI spec compliance',
    endpoints: {
      health: '/health',
      flights: '/api/flights?airport=ICAO&user=username',
      debug: '/api/flights?airport=ICAO&user=username&debug=true'
    }
  });
});

// FlightAware API Proxy endpoint - CHATGPT HOTFIX (Time Window Validation)
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

  // ✨ 2) Start < End sicherstellen (sonst 400)
  const ensureOrder = (s, e) => (s < e) ? [s, e] : [new Date(e), new Date(new Date(e).getTime() + 60*1000)];
  const [aS, aE] = ensureOrder(arrStart, arrEnd);
  const [sS, sE] = ensureOrder(schedStart, schedEnd);

  console.log(`🕐 Arrivals Range (Fixed): ${aS.toISOString()} to ${aE.toISOString()}`);
  console.log(`🕐 Scheduled Range (Fixed): ${sS.toISOString()} to ${sE.toISOString()}`);

  const base = 'https://aeroapi.flightaware.com/aeroapi';
  const H = { 'x-apikey': key, 'Accept': 'application/json; charset=UTF-8' };

  const urls = [
    `${base}/airports/${airport}/flights/arrivals?start=${aS.toISOString()}&end=${aE.toISOString()}&max_pages=3`,
    `${base}/airports/${airport}/flights/scheduled_arrivals?start=${sS.toISOString()}&end=${sE.toISOString()}&max_pages=3`
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
        source: 'AeroAPI - CHATGPT HOTFIX',
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
          flight: flight.ident || 'N/A',
          airline: flight.operator || 'Unknown',
          origin: flight.origin?.code || 'N/A',
          destination: flight.destination?.code || airport,
          scheduled: scheduledTime ? scheduledTime.toISOString() : null,
          estimated: estimatedTime ? estimatedTime.toISOString() : null,
          actual: actualTime ? actualTime.toISOString() : null,
          status: status,
          aircraft: flight.aircraft_type || 'N/A',
          type: type
        };
      });
    };
    
    const arrivedFlights = processFlights(arrived, 'arrivals');
    const futureFlights = processFlights(future, 'scheduled');
    const flights = [...arrivedFlights, ...futureFlights];

    return res.json({ 
      success: true, 
      flights, 
      meta: {
        total: flights.length, 
        arrived: arrivedFlights.length,
        scheduled: futureFlights.length,
        airport, 
        source: 'AeroAPI (arrivals+scheduled_arrivals) - CHATGPT HOTFIX', 
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
      source: 'CHATGPT HOTFIX'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FlightStat Backend running on port ${PORT}`);
  console.log(`🔑 API Key configured: ${!!process.env.AEROAPI_KEY}`);
  console.log(`🌐 CORS allowed origins: ${Array.from(allowList).join(', ')}`);
});