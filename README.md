# FlightStat Backend - Railway API Proxy

## 🎯 Purpose
This backend server acts as a CORS proxy for the FlightStat Bot 2025 frontend, enabling real FlightAware API data access from Netlify-hosted applications.

## 🚀 Deployment
This server is designed to run on Railway.app with zero configuration.

### Quick Deploy to Railway:
1. Push this folder to a GitHub repository
2. Connect the repository to Railway
3. Railway will automatically detect and deploy the Node.js app
4. No environment variables needed - API keys are passed via query parameters

## 🔧 API Endpoints

### Health Check
```
GET /
```
Returns server status and available endpoints.

### Flight Data
```
GET /api/flights?airport=FRA&key=YOUR_API_KEY&user=optional_user_id
```

**Parameters:**
- `airport` (required): IATA/ICAO airport code (e.g., FRA, KJFK)
- `key` (required): Your FlightAware Personal API key
- `user` (optional): User identifier for logging

**Response:**
```json
{
  "success": true,
  "flights": [...],
  "airport": "FRA",
  "timestamp": "2025-10-13T17:18:00.000Z",
  "meta": {
    "total": 25,
    "source": "FlightAware API via Railway Backend"
  }
}
```

## 🛡️ Security Features
- CORS configured for Netlify domains
- API key masking in logs
- Input validation
- Error handling
- No API keys stored on server

## 🏢 Office Usage
Perfect for enterprise environments where:
- Terminal access is restricted
- Local development servers can't run
- Browser-only access is required
- Multiple users need simultaneous access

## 💰 Cost
- Railway Free Tier: $5/month credit (more than enough for office use)
- Estimated usage cost: ~$0.50/month for 5 users
- No risk of unexpected charges (automatic limits)

## 🔗 Frontend Integration
The Netlify frontend automatically detects and uses this backend when deployed, falling back to demo data if the backend is unavailable.