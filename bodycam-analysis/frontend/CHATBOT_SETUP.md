# Agent Chatbot Integration Guide

## Overview
The Chat feature in the bodycam analysis app now integrates with an AI agent that uses Tavily search to answer questions about the video and provide relevant information.

## Setup Instructions

### 1. Install Backend Dependencies
```bash
cd bodycam-analysis/frontend
pip install -r server-requirements.txt
```

### 2. Set Environment Variables
Create or update `.env.local` in the project root with your Tavily API key:
```
TAVILY=your_tavily_api_key_here
```

### 3. Start the Backend Server
```bash
python server.py
```
The server will run on `http://localhost:5000`

### 4. Start the React Frontend (in a separate terminal)
```bash
npm start
```
The frontend will run on `http://localhost:3000`

## How It Works

### Frontend (App.js)
- When a user sends a message in the Chat tab, the `handleSendMessage` function now:
  1. Sends the message to the backend API at `/api/chat`
  2. Includes the current video timestamp for context
  3. Displays the AI response with sources

### Backend (server.py)
- Receives messages via POST request to `/api/chat`
- Calls the `agent.py` function which uses Tavily search
- Returns the search results and answer formatted as JSON
- Supports CORS for frontend requests

## API Endpoint

### POST `/api/chat`
**Request:**
```json
{
  "message": "what is congressional app",
  "videoTime": 0,
  "timestamp": "00:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "The answer from Tavily search...",
  "results": [
    {
      "title": "Result title",
      "url": "https://example.com"
    }
  ]
}
```

## Features
- Tavily search integration for accurate information retrieval
- Web sources citation in chat responses
- Video context passing (current timestamp)
- Error handling with user-friendly messages
- CORS support for cross-origin requests

## Troubleshooting

**Port 5000 already in use:**
Modify `server.py` port or kill the process using port 5000

**CORS errors:**
Ensure Flask-CORS is installed: `pip install flask-cors`

**Tavily API key not found:**
Check `.env.local` is in the correct directory and has the right format

**"Error connecting to AI agent":**
Ensure the backend server is running on port 5000
