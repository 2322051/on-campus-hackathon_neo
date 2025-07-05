import copy
import time
import random
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.staticfiles import StaticFiles

# --- FastAPIアプリの初期化 ---
app = FastAPI()
# 'static' フォルダ内のファイルを配信するための設定
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS設定 ---
# 開発中のフロントエンドからのアクセスを許可
origins = ["http://localhost", "http://localhost:8081"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydanticモデル (APIのデータ構造定義) ---
class FeedItem(BaseModel):
    feed_id: int
    paper_id: str
    title: str
    authors: List[str]
    summary: str
    audio_url: str
    paper_url: str
    is_bookmarked: bool

class FeedResponse(BaseModel):
    items: List[FeedItem]

class BookmarkRequest(BaseModel):
    paper_id: str

class UserSettings(BaseModel):
    user_id: int
    character_voice: int

class UserSettingsUpdateRequest(BaseModel):
    character_voice: Optional[int] = None

# --- インメモリのダミーデータベース ---

# 1. 初回起動時に即時表示するための仮のデータベース (10件)
INITIAL_STATIC_FEED = [
    FeedItem(feed_id="static_001", paper_id="1706.03762", title="Attention Is All You Need", authors=["Ashish Vaswani", "et al."], summary="現代の多くの大規模言語モデルの基礎となっているTransformerアーキテクチャを提案した画期的な論文。", audio_url="http://127.0.0.1:8000/static/sample1.mp3", paper_url="http://arxiv.org/abs/1706.03762", is_bookmarked=False),
    FeedItem(feed_id="static_002", paper_id="1512.03385", title="Deep Residual Learning for Image Recognition", authors=["Kaiming He", "et al."], summary="非常に深いニューラルネットワークの学習を可能にする残差学習（ResNet）を導入し、画像認識の精度を飛躍的に向上させた。", audio_url="http://127.0.0.1:8000/static/sample2.mp3", paper_url="http://arxiv.org/abs/1512.03385", is_bookmarked=False),
    FeedItem(feed_id="static_003", paper_id="2005.14165", title="GPT-3: Language Models are Few-Shot Learners", authors=["Tom B. Brown", "et al."], summary="1750億ものパラメータを持つGPT-3の能力を示し、少数の例を与えるだけで様々なタスクをこなす「few-shot learning」の可能性を切り開いた。", audio_url="http://127.0.0.1:8000/static/sample3.mp3", paper_url="http://arxiv.org/abs/2005.14165", is_bookmarked=True),
    # ... 他、合計10件のデータ
]

# 2. パーソナライズフィードの元となる本番用データベース (30件)
FULL_PAPER_DATABASE = INITIAL_STATIC_FEED + [
    FeedItem(feed_id="full_011", paper_id="1412.6980", title="Adam: A Method for Stochastic Optimization", authors=["Diederik P. Kingma", "Jimmy Ba"], summary="深層学習で最も広く使われている最適化アルゴリズムの一つであるAdamを提案。", audio_url="http://127.0.0.1:8000/static/sample2.mp3", paper_url="http://arxiv.org/abs/1412.6980", is_bookmarked=False),
    # ... 他、合計30件になるまでのデータ
]

# ユーザー操作によって変化する、サーバーが記憶している現在の状態
DB = {
    # paper_idのリストとして保持
    "bookmarks": ["2005.14165"], 
    # ユーザーごとの設定を保持
    "user_settings": {1: {"user_id": 1, "character_voice": 1}}
}

# ユーザーごとのパーソナライズされたフィードキューを保存する場所
USER_FEEDS = {} # { user_id: [FeedItem, FeedItem, ...] }


# --- ヘルパー関数 ---
def generate_feed_for_user(user_id: int, count: int = 30) -> List[FeedItem]:
    """ユーザー専用のフィードを生成または再生成する"""
    print(f"Generating new feed for user {user_id}...")
    time.sleep(2) # 音声合成などの重い処理をシミュレート
    
    new_feed = copy.deepcopy(FULL_PAPER_DATABASE[:count])
    
    for item in new_feed:
        item.is_bookmarked = item.paper_id in DB["bookmarks"]
        
    USER_FEEDS[user_id] = new_feed
    print(f"Feed for user {user_id} generated.")
    return new_feed

def add_one_paper_to_feed(user_id: int):
    """(バックグラウンドで実行)パーソナライズフィードに新しい論文を1件だけ追加する"""
    print(f"BACKGROUND: Adding one more paper to feed for user {user_id}...")
    if user_id in USER_FEEDS:
        current_ids = {item.paper_id for item in USER_FEEDS[user_id]}
        for paper in FULL_PAPER_DATABASE:
            if paper.paper_id not in current_ids:
                new_item = copy.deepcopy(paper)
                new_item.is_bookmarked = new_item.paper_id in DB["bookmarks"]
                USER_FEEDS[user_id].append(new_item)
                print(f"BACKGROUND: Added {new_item.paper_id}. Queue length is now {len(USER_FEEDS[user_id])}.")
                return

# --- APIエンドポイントの定義 ---

@app.get("/api/feed/initial", response_model=FeedResponse)
def get_initial_feed():
    """# 呼び出し: アプリ初回起動時。
    # 役割: 即時表示用の固定フィード10件を返す。"""
    print("API: Returning initial static feed.")
    initial_feed = copy.deepcopy(INITIAL_STATIC_FEED)
    for item in initial_feed:
         item.is_bookmarked = item.paper_id in DB["bookmarks"]
    return {"items": initial_feed}

@app.post("/api/feed/generate", status_code=202)
def start_user_feed_generation(user_id: int, background_tasks: BackgroundTasks):
    """# 呼び出し: アプリ初回起動時。
    # 役割: 時間のかかるパーソナライズフィードの生成をバックグラウンドで開始させる。"""
    print(f"API: Received request to generate feed for user {user_id}.")
    background_tasks.add_task(generate_feed_for_user, user_id, 30)
    return {"message": "Feed generation started in background."}

@app.get("/api/feed/next", response_model=FeedItem)
def get_next_feed_item(user_id: int, background_tasks: BackgroundTasks):
    """# 呼び出し: ユーザーがスワイプし、次の論文が必要になった時。
    # 役割: 準備済みのパーソナライズフィードから1件返し、裏で次の1件を補充する。"""
    user_feed_queue = USER_FEEDS.get(user_id)
    if not user_feed_queue:
        raise HTTPException(status_code=404, detail="Personalized feed is not ready yet.")
    
    next_item = user_feed_queue.pop(0)
    # 次の論文の生成をバックグラウンドで開始
    background_tasks.add_task(add_one_paper_to_feed, user_id)
    return next_item

@app.get("/api/bookmarks", response_model=FeedResponse)
def get_bookmarks():
    """# 呼び出し: 「履歴」タブ表示時。
    # 役割: 現在のブックマークリストを返す。"""
    bookmarked_papers = []
    for paper in FULL_PAPER_DATABASE:
        if paper.paper_id in DB["bookmarks"]:
            paper_copy = copy.deepcopy(paper)
            paper_copy.is_bookmarked = True
            bookmarked_papers.append(paper_copy)
    return {"items": bookmarked_papers}

@app.post("/api/bookmarks", status_code=status.HTTP_201_CREATED)
def add_bookmark(req: BookmarkRequest):
    """# 呼び出し: 未保存の論文をブックマークした時。
    # 役割: 論文IDをブックマークリストに追加する。"""
    if req.paper_id not in DB["bookmarks"]:
        DB["bookmarks"].append(req.paper_id)
    return {"status": "success"}

@app.delete("/api/bookmarks", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(req: BookmarkRequest):
    """# 呼び出し: 保存済みの論文をブックマーク解除した時。
    # 役割: 論文IDをブックマークリストから削除する。"""
    if req.paper_id in DB["bookmarks"]:
        DB["bookmarks"].remove(req.paper_id)
    return

@app.get("/api/settings/{user_id}", response_model=UserSettings)
def get_user_settings(user_id: int):
    """# 呼び出し: 「設定」画面表示時。
    # 役割: 現在のユーザー設定を返す。"""
    settings = DB["user_settings"].get(user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="User settings not found")
    return settings

@app.post("/api/settings/{user_id}", response_model=FeedResponse)
def update_user_settings(user_id: int, settings_update: UserSettingsUpdateRequest):
    """# 呼び出し: 設定画面で「更新」ボタンが押された時。
    # 役割: 設定を更新し、フィードを同期的に再生成して、新しいフィードの先頭10件を返す。"""
    current_settings = DB["user_settings"].get(user_id)
    if not current_settings:
        raise HTTPException(status_code=404, detail="User settings not found")
    
    update_data = settings_update.dict(exclude_unset=True)
    current_settings.update(update_data)
    
    # 同期的に新しいフィードを生成
    new_feed = generate_feed_for_user(user_id, 30)
    
    # 新しいフィードの最初の10件を返す
    return {"items": new_feed[:10]}