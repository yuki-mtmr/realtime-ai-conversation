### realtime-ai-conversation

### 環境準備

Make sure you're running Python 3.10 or later, then install `uv` to be able to run the project:

```bash
pip install uv

```

And make sure you have both `OPENAI_API_KEY` and `TAVILY_API_KEY` environment variables set up.

```bash
export OPENAI_API_KEY=your_openai_api_key
export TAVILY_API_KEY=your_tavily_api_key
```
Note: the Tavily API key is for the Tavily search engine, you can get an API key [here](https://app.tavily.com/). This is just an example tool, and if you do not want to use it you do not have to (see [Adding your own tools](#adding-your-own-tools))

### アプリの実行
```bash
cd server
uv run src/server/app.py
```


### アプリを実行したら下記にアクセス

http://localhost:3000/