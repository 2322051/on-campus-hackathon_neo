import copy
import time
import random
from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from fastapi.staticfiles import StaticFiles
import os
import datetime
import uuid
import base64
from dotenv import load_dotenv
from typing import Any, Dict
from supabase import create_client, Client  # type: ignore  # pylint: disable=import-error
import inspect
import sys

# プロジェクトルートをパスに追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.modules.FeedGenerator import generate_and_store_feed_for_user, add_one_paper_to_feed


load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]


# --- FastAPIアプリの初期化 ---
app = FastAPI()
# 'static' フォルダ内のファイルを配信するための設定
# app.mount("/static", StaticFiles(directory="static"), name="static")

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
    audio_base64: str  # audio_urlから変更
    paper_url: str
    is_bookmarked: bool

class FeedResponse(BaseModel):
    items: List[FeedItem]

class BookmarkItem(BaseModel):
    bookmark_id: int
    user_id: int
    title: str
    author: str
    url: str
    references_date: str # Supabaseのdate型に合わせて文字列で定義

class BookmarkResponse(BaseModel):
    items: List[BookmarkItem]

class BookmarkRequest(BaseModel):
    paper_id: str

class UserSettings(BaseModel):
    uuid: str
    voice_type: int = 3 # VOICE_TYPE_DEFAULT

class UserSettingsUpdateRequest(BaseModel):
    character_voice: Optional[int] = None


# 初回でのフィード取得．あとで処理をかく．feedはuser_idが必要なので，そこをなんとかする．
@app.post("/api/feed/initial/{user_id}", response_model=FeedResponse)
def get_initial_feed(user_id: int, req: UserSettings):
    """# 呼び出し: アプリ初回起動時。
    # 役割: 即時表示用の固定フィード10件を返す。"""
    uuid_for_db = req.uuid
    voice_type_for_db = req.voice_type

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # user_info テーブルにユーザー情報を格納
        response_user_ids = supabase.table("user_info").select("user_id").eq("user_id", user_id).execute()
        if not response_user_ids.data:
            user_data = {
                "user_id": user_id,
                "uuid": uuid_for_db,
                "voice_type": voice_type_for_db
            }
            insert_response = supabase.table("user_info").insert(user_data).execute()
            if insert_response.data:
                print("user_info データ挿入成功:", insert_response.data)
            else:
                print("user_info データ挿入失敗:", insert_response.error)
        else:
            print(f"user_infoテーブルに既にuser_id: {user_id} のデータが存在します。")

        # paper_infoテーブルから最新10件の論文を取得
        papers_response = supabase.table("paper_info").select("*").order("published_date", desc=True).limit(10).execute()
        papers = papers_response.data
        if not papers:
            return {"items": []}

        paper_ids = [p['paper_id'] for p in papers]

        # feedテーブルから関連データを取得
        feed_response = supabase.table("feed").select("paper_id, feed_id, gemini_abstract").in_("paper_id", paper_ids).execute()
        feed_map = {item['paper_id']: item for item in feed_response.data}

        # bookmarkテーブルからユーザーのブックマークを取得
        bookmark_response = supabase.table("bookmark").select("paper_id").eq("user_id", user_id).in_("paper_id", paper_ids).execute()
        bookmarked_paper_ids = {item['paper_id'] for item in bookmark_response.data}

        initial_feed = []
        for paper in papers:
            paper_id = paper["paper_id"]
            feed_data = feed_map.get(paper_id)

            if not feed_data:
                continue

            authors = [author.strip() for author in paper.get("author", "").split(',')]

            feed_item = FeedItem(
                feed_id=feed_data["feed_id"],
                paper_id=str(paper_id),
                title=paper["title"],
                authors=authors,
                summary=feed_data.get("gemini_abstract", paper.get("abstract", "")),
                audio_url=f"http://127.0.0.1:8000/api/audio/{feed_data['feed_id']}",
                paper_url=paper["arxiv_url"],
                is_bookmarked=paper_id in bookmarked_paper_ids
            )
            initial_feed.append(feed_item)

        return {"items": initial_feed}

    except Exception as e:
        caller_frame = inspect.currentframe().f_back
        caller_function_name = caller_frame.f_code.co_name if caller_frame else "Unknown"
        caller_line_number = caller_frame.f_lineno if caller_frame else 0
        print(f"Error in {caller_function_name} at line {caller_line_number}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching initial feed: {e}")


@app.post("/api/feed/generate/{user_id}", status_code=202)
def start_user_feed_generation(user_id: int, background_tasks: BackgroundTasks):
    """# 呼び出し: アプリ初回起動時。
    # 役割: 時間のかかるパーソナライズフィードの生成をバックグラウンドで開始させる。"""
    print(f"API: Received request to generate feed for user {user_id}.")
    background_tasks.add_task(generate_and_store_feed_for_user, user_id, 30)
    return {"message": "Feed generation started in background."}

@app.get("/api/feed/next/{user_id}", response_model=FeedItem)
def get_next_feed_item(user_id: int, background_tasks: BackgroundTasks):
    """# 呼び出し: ユーザーがスワイプし、次の論文が必要になった時。
    # 役割: feedテーブルから1件返し、裏で次の1件を補充する。"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # 1. feedテーブルから最も古いレコードを取得
        feed_res = supabase.table("feed").select("*").eq("user_id", user_id).order("feed_id", desc=False).limit(1).single().execute()

        if not feed_res.data:
            raise HTTPException(status_code=404, detail="Personalized feed is not ready or empty.")

        feed_data = feed_res.data
        feed_id_to_delete = feed_data['feed_id']
        paper_id = feed_data['paper_id']

        # 2. 取得したレコードをfeedテーブルから削除
        supabase.table("feed").delete().eq("feed_id", feed_id_to_delete).execute()
        print(f"API: Deleted feed_id: {feed_id_to_delete} for user_id: {user_id}")

        # 3. paper_infoテーブルから不足している情報を取得
        paper_info_res = supabase.table("paper_info").select("title, author, arxiv_url").eq("paper_id", paper_id).single().execute()
        if not paper_info_res.data:
            # この場合、feedテーブルに孤立したデータがあったことになる。エラーとして扱う。
            raise HTTPException(status_code=404, detail=f"Paper info not found for paper_id: {paper_id}")

        paper_info = paper_info_res.data
        authors = [author.strip() for author in paper_info.get("author", "").split(',')]

        # 4. バックグラウンドで補充タスクを開始
        background_tasks.add_task(add_one_paper_to_feed, user_id)

        # 5. レスポンスを組み立てて返却
        next_item = FeedItem(
            feed_id=feed_data["feed_id"],
            paper_id=str(paper_id),
            title=paper_info["title"],
            authors=authors,
            summary=feed_data["gemini_abstract"],
            audio_base64=feed_data["voice"], # Base64データを直接セット
            paper_url=paper_info["arxiv_url"],
            is_bookmarked=False # ブックマーク情報は別APIで管理
        )
        return next_item

    except Exception as e:
        caller_frame = inspect.currentframe().f_back
        caller_function_name = caller_frame.f_code.co_name if caller_frame else "Unknown"
        caller_line_number = caller_frame.f_lineno if caller_frame else 0
        print(f"Error in {caller_function_name} at line {caller_line_number}: {e}")
        if "PGRST116" in str(e): # "The result contains 0 rows"
             raise HTTPException(status_code=404, detail="Personalized feed is not ready or empty.")
        raise HTTPException(status_code=500, detail=f"An error occurred while fetching next feed: {e}")

@app.get("/api/bookmarks/{user_id}", response_model=BookmarkResponse)
def get_bookmarks(user_id: int):
    """# 呼び出し: 「履歴」タブ表示時。
    # 役割: 現在のブックマークリストを返す。"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

        # 1. 指定されたuser_idのブックマークを取得
        bookmark_res = supabase.table("bookmark").select("*").eq("user_id", user_id).execute()
        if not bookmark_res.data:
            return {"items": []} # ブックマークがない場合は空のリストを返す

        bookmarked_items = []
        for bookmark_entry in bookmark_res.data:
            for key in ["bookmark_id", "user_id", "title", "author", "url", "references_date"]:
                if key not in bookmark_entry:
                    raise HTTPException(status_code=500, detail=f"Missing '{key}' in bookmark entry")
            item = BookmarkItem(
                bookmark_id=bookmark_entry["bookmark_id"],
                user_id=bookmark_entry["user_id"],
                title=bookmark_entry["title"],
                author=bookmark_entry["author"],
                url=bookmark_entry["url"],
                references_date=bookmark_entry["references_date"]
            )
            bookmarked_items.append(item)
        return {"items": bookmarked_items}

    except Exception as e:
        print(f"Error in get_bookmarks: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while fetching bookmarks.")

@app.post("/api/bookmarks/{user_id}", status_code=status.HTTP_201_CREATED)
def add_bookmark(user_id: int, req: BookmarkRequest):
    """# 呼び出し: ブックマークボタンが押された時のAPI。
    # 役割: リクエストで受け取った paper_id をキーに、paper_info テーブルから詳細情報を取得し、bookmark テーブルに新規レコードを追加する。"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    # 1. paper_infoから論文情報を取得する
    paper_info_res = supabase.table("paper_info").select("title, author, arxiv_url").eq("paper_id", req.paper_id).single().execute()
    if not paper_info_res.data:
         raise HTTPException(status_code=404, detail=f"Paper info not found for paper_id: {req.paper_id}")
    paper_info = paper_info_res.data
    # 2. bookmark テーブルから最大の bookmark_id を取得し、新規IDを採番する
    bookmark_id_res = supabase.table("bookmark").select("bookmark_id").order("bookmark_id", desc=True).limit(1).execute()
    if bookmark_id_res.data and len(bookmark_id_res.data) > 0:
        new_bookmark_id = int(bookmark_id_res.data[0]["bookmark_id"]) + 1
    else:
        new_bookmark_id = 1
    # 3. 新規レコードを組み立てる
    new_record = {
         "bookmark_id": new_bookmark_id,
         "user_id": user_id,
         "title": paper_info["title"],
         "author": paper_info["author"],
         "url": paper_info["arxiv_url"],
         "references_date": datetime.datetime.now().isoformat()
    }
    # 4. bookmark テーブルにレコードを挿入
    insert_res = supabase.table("bookmark").insert(new_record).execute()
    if not insert_res.data:
          raise HTTPException(status_code=500, detail="Failed to add bookmark")
    return {"status": "success", "bookmark": new_record}

@app.delete("/api/bookmarks/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bookmark(user_id: int, req: BookmarkRequest):
    """# 呼び出し: ブックマーク解除時のAPI。
    # 役割: リクエストで受け取った paper_id をキーに、paper_info テーブルから該当論文の情報（title, author）を取得し、
    #        user_id に紐づく bookmark テーブルから、同じ title と author のレコードを削除する。
    #        arxiv_url は削除のキーとして使用しません。"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    # 1. paper_info テーブルから該当論文の情報（title, author）を取得
    paper_info_res = supabase.table("paper_info").select("title, author").eq("paper_id", req.paper_id).single().execute()
    if not paper_info_res.data:
         raise HTTPException(status_code=404, detail=f"Paper info not found for paper_id: {req.paper_id}")
    paper_info = paper_info_res.data
    # 2. bookmark テーブルから user_id と、title および author が一致するレコードを削除
    delete_res = supabase.table("bookmark")\
        .delete()\
        .eq("user_id", user_id)\
        .eq("title", paper_info["title"])\
        .eq("author", paper_info["author"])\
        .execute()
    if not delete_res.data:
         raise HTTPException(status_code=404, detail="Bookmark not found")
    return

@app.get("/api/settings/{user_id}", response_model=UserVoiceSettings)
def get_user_settings(user_id: int):
    """# 呼び出し: 「設定」画面表示時。
    # 役割: 現在のユーザー設定からvoice_typeのみをSupabaseのuser_infoテーブルから取得して返す。"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    settings_res = supabase.table("user_info").select("voice_type").eq("user_id", user_id).single().execute()
    if not settings_res.data:
        raise HTTPException(status_code=404, detail="User settings not found")
    return {"voice_type": settings_res.data["voice_type"]}

@app.post("/api/settings/{user_id}", response_model=FeedResponse)
def update_user_settings(user_id: int, settings_update: UserSettingsUpdateRequest):
    """# 呼び出し: 設定画面で「更新」ボタンが押された時。
    # 役割: 設定（例: character_voice）の更新を supabase を使って user_info テーブルに反映し、
    #        feed テーブルの該当レコードを削除、フィードを再生成して、その先頭10件を返す。"""
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    update_data = settings_update.dict(exclude_unset=True)
    update_res = supabase.table("user_info").update(update_data).eq("user_id", user_id).execute()
    if not update_res.data:
         raise HTTPException(status_code=404, detail="User settings not found")
    # feed テーブルから該当 user_id の全レコードを削除する
    supabase.table("feed").delete().eq("user_id", user_id).execute()
    # 同期的に新しいフィードを生成する
    new_feed = generate_and_store_feed_for_user(user_id, 30)
    return {"items": new_feed[:10]}
