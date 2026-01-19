from typing import Optional
from tavily import TavilyClient
import json
import dotenv
import os

dotenv.load_dotenv(dotenv_path="../../.env.local")

client = TavilyClient(os.getenv("TAVILY"))

def response(query: str) -> object:
    response = client.search(
        query=query,
        include_answer="advanced",
        search_depth="basic"
    )

    return response

print(response("what is congresional app"))