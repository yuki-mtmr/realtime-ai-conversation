from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

from langchain_openai_voice import OpenAIVoiceReactAgent
from server.utils import websocket_stream
from server.prompt import INSTRUCTIONS
from server.tools import TOOLS

app = FastAPI()

# 静的ファイルのマウント
app.mount("/static", StaticFiles(directory="src/server/static"), name="static")


@app.get("/")
async def get_home():
    """
    ホームページを返すエンドポイント
    """
    with open("src/server/static/index.html", "r") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocketエンドポイント
    """
    try:
        await websocket.accept()

        # ブラウザからのストリームを設定
        browser_receive_stream = websocket_stream(websocket)

        # エージェントの初期化
        agent = OpenAIVoiceReactAgent(
            model="gpt-4o-mini-realtime-preview",
            tools=TOOLS,
            instructions=INSTRUCTIONS,
        )

        # エージェントの接続を開始
        await agent.aconnect(browser_receive_stream, websocket.send_text)

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error in websocket connection: {e}")
        try:
            await websocket.close(code=1000)
        except Exception as close_error:
            print(f"Error closing websocket: {close_error}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3000)
