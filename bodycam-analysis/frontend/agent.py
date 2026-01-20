from typing import Optional
from tavily import TavilyClient
import json
import dotenv
import os

# Load .env.local from frontend directory or parent directories
dotenv.load_dotenv(dotenv_path=".env.local")
if not os.getenv("TAVILY"):
    dotenv.load_dotenv(dotenv_path="../../.env.local")

api_key = os.getenv("TAVILY")
if not api_key:
    raise ValueError("TAVILY API key not found. Please set TAVILY environment variable or create .env.local file.")

client = TavilyClient(api_key)

def response(query: str) -> object:
    response = client.search(
        query=query,
        include_answer="advanced",
        search_depth="basic"
    )

    return response

print(response("You are a master police chief seargant that is looking at information from bodycam footage. Answer the questions in this manner, with high insight and intelligence"))