import copy
from fastapi import FastAPI, HTTPException, Body, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Literal, Optional # ★★★ Optional と List が必要です ★★★
from fastapi.staticfiles import StaticFiles

# --- FastAPIアプリの初期化 ---
app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- CORS設定 ---
origins = [
    "http://localhost",
    "http://localhost:8081",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 既存のPydanticモデル ---
class FeedItem(BaseModel):
    feed_id: str
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

class ActionRequest(BaseModel):
    paper_id: str
    action_type: Literal["listen", "skip", "save"]
    value: float

# ★★★ ここから新しいPydanticモデルの定義を追加 ★★★
class UserProfile(BaseModel):
    # user_info.profile に対応するJSONスキーマ
    # 例: display_name: Optional[str] = None
    # 例: bio: Optional[str] = None
    pass # 今は空のモデルでOK、必要に応じて詳細を追加

class UserSettingsResponse(BaseModel):
    user_id: int
    character_voice: int
    category: List[str]
    profile: UserProfile
    keyword: str
    additional_prompt: str
    receive_notifications: bool = True
    autoplay_feed: bool = True

class UserSettingsUpdateRequest(BaseModel):
    character_voice: Optional[int] = None
    category: Optional[List[str]] = None
    profile: Optional[UserProfile] = None
    keyword: Optional[str] = None
    additional_prompt: Optional[str] = None
    receive_notifications: Optional[bool] = None
    autoplay_feed: Optional[bool] = None
# ★★★ ここまで新しいPydanticモデルの定義を追加 ★★★


# --- インメモリのダミーデータベース ---
INITIAL_FEED_ITEMS = [
    FeedItem(
        feed_id="feed_item_unique_id_001",
        paper_id="1706.03762",
        title="Attention Is All You Need",
        authors=["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
        summary="この論文は、注意機構のみを用いた新しいニューラルネットワークアーキテクチャであるトランスフォーマーを提案します。",
        audio_url="http://127.0.0.1:8000/static/carousel.mp3",
        paper_url="http://arxiv.org/abs/1706.03762",
        is_bookmarked=False
    ),
    FeedItem(
        feed_id="feed_item_unique_id_002",
        paper_id="2005.14165",
        title="GPT-3: Language Models are Few-Shot Learners",
        authors=["Tom B. Brown", "Benjamin Mann", "Nick Ryder"],
        summary="我々は、1750億のパラメータを持つ自己回帰言語モデルであるGPT-3を訓練し、少数ショット学習の文脈でテストしました。",
        audio_url="http://127.0.0.1:8000/static/kanpai.mp3",
        paper_url="http://arxiv.org/abs/2005.14165",
        is_bookmarked=True
    )
]

# ユーザー設定のダミーデータもDB構造に追加
DUMMY_USER_SETTINGS_DB = {
    "user_id": 1,
    "character_voice": 1,
    "category": ["Computer Science", "Artificial Intelligence"],
    "profile": {},
    "keyword": "Transformer, GPT, Machine Learning",
    "additional_prompt": "専門用語は避け、分かりやすい言葉で解説してください。",
    "receive_notifications": True,
    "autoplay_feed": True,
}

DB = {
    "bookmarks": [copy.deepcopy(INITIAL_FEED_ITEMS[1])],
    "actions": [],
    "user_settings": {1: copy.deepcopy(DUMMY_USER_SETTINGS_DB)} # user_idをキーとして設定を保存
}


# --- 既存のAPIエンドポイントの定義 ---
@app.get("/api/feed", response_model=FeedResponse)
def get_feed(count: int = 5):
    feed_items_to_return = copy.deepcopy(INITIAL_FEED_ITEMS)
    
    bookmarked_ids = [item.paper_id for item in DB["bookmarks"]]
    
    for item in feed_items_to_return:
        if item.paper_id in bookmarked_ids:
            item.is_bookmarked = True
        else:
            item.is_bookmarked = False
            
    return {"items": feed_items_to_return[:count]}

@app.get("/api/bookmarks", response_model=FeedResponse)
def get_bookmarks():
    return {"items": DB["bookmarks"]}

@app.post("/api/bookmarks", status_code=status.HTTP_201_CREATED)
def add_bookmark(req: BookmarkRequest):
    for bookmark in DB["bookmarks"]:
        if bookmark.paper_id == req.paper_id:
            raise HTTPException(status_code=409, detail="Bookmark already exists")
    
    paper_to_add = None
    for paper in INITIAL_FEED_ITEMS:
        if paper.paper_id == req.paper_id:
            paper_to_add = copy.deepcopy(paper)
            break
            
    if not paper_to_add:
        raise HTTPException(status_code=404, detail="Paper not found in original list")
        
    DB["bookmarks"].append(paper_to_add)
    print(f"Bookmark added. Total: {len(DB['bookmarks'])}")
    return {"status": "success", "paper_id": req.paper_id}

@app.delete("/api/bookmarks", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(req: BookmarkRequest):
    initial_length = len(DB["bookmarks"])
    DB["bookmarks"] = [b for b in DB["bookmarks"] if b.paper_id != req.paper_id]
    
    if len(DB["bookmarks"]) == initial_length:
        raise HTTPException(status_code=404, detail="Bookmark not found")
        
    print(f"Bookmark deleted. Total: {len(DB['bookmarks'])}")
    return

@app.post("/api/actions", status_code=status.HTTP_202_ACCEPTED)
def log_action(req: ActionRequest):
    DB["actions"].append(req.dict())
    print(f"Action logged: {req.dict()}")
    return {"status": "accepted"}

# ★★★ ここから新しいAPIエンドポイントの定義を追加 ★★★
@app.get("/api/settings/{user_id}", response_model=UserSettingsResponse)
def get_user_settings(user_id: int):
    settings = DB["user_settings"].get(user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="User settings not found")
    return settings

@app.patch("/api/settings/{user_id}", response_model=UserSettingsResponse)
def update_user_settings(user_id: int, settings_update: UserSettingsUpdateRequest):
    current_settings = DB["user_settings"].get(user_id)
    if not current_settings:
        raise HTTPException(status_code=404, detail="User settings not found")

    update_data = settings_update.dict(exclude_unset=True) 
    
    # ダミーデータを部分的に更新
    for key, value in update_data.items():
        current_settings[key] = value

    DB["user_settings"][user_id] = current_settings # 更新をDBに反映
    print(f"ユーザーID {user_id} の設定を更新しました: {update_data}")
    return current_settings
# ★★★ ここまで新しいAPIエンドポイントの定義を追加 ★★★