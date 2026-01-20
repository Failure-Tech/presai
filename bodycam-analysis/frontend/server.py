from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
import logging

# Setup logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Check for environment variables
env_path = "../../.env.local"
if not os.path.exists(env_path):
    logger.warning(f"Environment file not found at {env_path}")
    # Try other common locations
    if os.path.exists(".env.local"):
        env_path = ".env.local"
    elif os.path.exists("../.env.local"):
        env_path = "../.env.local"
    else:
        logger.warning("No .env.local file found. Please ensure TAVILY API key is set.")

try:
    from agent import response as get_agent_response
except ImportError as e:
    logger.error(f"Failed to import agent: {e}")
    get_agent_response = None

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Server is running'}), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        if get_agent_response is None:
            return jsonify({'error': 'Agent module not loaded', 'success': False}), 500
            
        data = request.json
        query = data.get('message', '')
        
        if not query:
            return jsonify({'error': 'No message provided', 'success': False}), 400
        
        logger.debug(f"Received query: {query}")
        
        # Get response from agent
        agent_response = get_agent_response(query)
        
        logger.debug(f"Agent response: {agent_response}")
        
        # Format the response
        formatted_response = {
            'success': True,
            'message': agent_response.get('answer', 'No answer found'),
            'results': agent_response.get('results', []),
            'raw': agent_response
        }
        
        return jsonify(formatted_response)
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}", exc_info=True)
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    print("Starting AI Agent Server...")
    print("Listening on http://localhost:5000")
    print("API endpoint: /api/chat")
    app.run(debug=True, port=5000, host='localhost')
