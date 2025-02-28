from langchain_core.tools import tool

from langchain_community.tools import TavilySearchResults
import requests


@tool
def translate_text(text: str, target_language: str = "en"):
    """Translate text between English and Japanese."""

    url = "https://api-free.deepl.com/v2/translate"
    params = {
        "auth_key": "YOUR_DEEPL_API_KEY",
        "text": text,
        "target_lang": "EN" if target_language == "en" else "JA"
    }
    response = requests.post(url, data=params).json()

    return response["translations"][0]["text"]


tavily_tool = TavilySearchResults(
    max_results=5,
    include_answer=True,
    description=(
        "This is a search tool for accessing the internet.\n\n"
        "Let the user know you're asking your friend Tavily for help before you call the tool."
    ),
)

TOOLS = [translate_text, tavily_tool]
