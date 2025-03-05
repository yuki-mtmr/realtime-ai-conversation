from langchain_core.tools import tool
import requests
import os
from dotenv import load_dotenv

load_dotenv()


@tool
def translate_text(text: str, target_language: str = "en"):
    """Translate text between English and Japanese."""

    url = "https://api-free.deepl.com/v2/translate"
    params = {
        "auth_key": os.getenv("DEEPL_API_KEY"),
        "text": text,
        "target_lang": "EN" if target_language == "en" else "JA"
    }
    response = requests.post(url, data=params).json()

    return response["translations"][0]["text"]

# Tavilyツールを一時的にコメントアウト
# tavily_tool = TavilySearchResults(
#     max_results=5,
#     include_answer=True,
#     description=(
#         "This is a search tool for accessing the internet.\n\n"
#         "Let the user know you're asking your friend Tavily for help before you call the tool."
#     ),
# )


TOOLS = [translate_text]  # tavilyツールを除外
