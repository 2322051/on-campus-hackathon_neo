#!/usr/bin/env python3
# pyright: ignore-all-errors

# pyright: reportMissingImports=false
import os
import datetime
import uuid
import base64

from dotenv import load_dotenv
from typing import Any, Dict

from supabase import create_client, Client  # type: ignore  # pylint: disable=import-error


import inspect


load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]


supabase: Any = create_client(SUPABASE_URL, SUPABASE_KEY)  # type: ignore
print(supabase)

### 確認phase ###
# データの確認．
response_user_info = supabase.table('user_info').select('*').execute()
print("user_infoテーブルの中身:")
print(response_user_info.data)

response_bookmark = supabase.table('bookmark').select('*').execute()
print("bookmarkテーブルの中身:")
print(response_bookmark.data)

response_feed = supabase.table('feed').select('*').execute()
print("feedテーブルの中身:")
print(response_feed.data)

response_paper_info = supabase.table('paper_info').select('*').execute()
print("paper_infoテーブルの中身:")
print(response_paper_info.data)




# test_user = {
#     "user_id": 1,
#     "uuid": str(uuid.uuid4()),  # UUIDを生成して文字列に変換
#     "voice_type": 1,  # 任意の値を設定
# }

# # --- データ挿入phase ---

# ## user_infoデータの挿入
# user_info_data = {
#     "user_id": test_user["user_id"],
#     "uuid": test_user["uuid"],
#     "voice_type": 1,
# }

# # 既存のuser_idを全て取得
# response_user_ids = supabase.table("user_info").select("user_id").execute()
# existing_user_ids = {item["user_id"] for item in response_user_ids.data}

# if user_info_data["user_id"] not in existing_user_ids:
#     insert_response = supabase.table("user_info").insert(user_info_data).execute()
#     if insert_response.data:
#         print("user_info データ挿入成功:", insert_response.data)
#     else:
#         print("user_info データ挿入失敗:", insert_response.error)
# else:
#     print(f"user_infoテーブルに既にuser_id: {user_info_data['user_id']} のデータが存在します。挿入をスキップします。")



# ## ブックマークデータの挿入
# book_mark_data = {
#     "bookmark_id": 1,
#     "user_id": 1,
#     "title": "Attention Is All You Need",
#     "author": "Ashish Vaswani et al.",
#     "url": "https://arxiv.org/abs/1706.03762",
#     "references_date": "2025-07-04",
# }

# # 既存のbookmark_idを全て取得
# response_bookmark_ids = supabase.table("bookmark").select("bookmark_id").execute()
# existing_bookmark_ids = {item["bookmark_id"] for item in response_bookmark_ids.data}

# if book_mark_data["bookmark_id"] not in existing_bookmark_ids:
#     insert_response = supabase.table("bookmark").insert(book_mark_data).execute()
#     if insert_response.data:
#         print("bookmark データ挿入成功:", insert_response.data)
#     else:
#         print("bookmark データ挿入失敗:", insert_response.error)
# else:
#     print(f"bookmarkテーブルに既にbookmark_id: {book_mark_data['bookmark_id']} のデータが存在します。挿入をスキップします。")



# ## paper_infoデータの挿入
# paper_info_data = {
#     "paper_id": 1,
#     "title": "Attention Is All You Need",
#     "author": "Ashish Vaswani et al.",
#     "published_date": "2017-6-12",
#     "arxiv_url": "https://arxiv.org/abs/1706.03762",
#     "arxiv_category": "CS",
#     "abstract": "this is abst",
#     "created_at": datetime.datetime.now().isoformat() + "Z"
# }

# # 既存のpaper_idとarxiv_urlを全て取得
# response_paper_ids = supabase.table("paper_info").select("paper_id").execute()
# existing_paper_ids = {item["paper_id"] for item in response_paper_ids.data}

# response_arxiv_urls = supabase.table("paper_info").select("arxiv_url").execute()
# existing_arxiv_urls = {item["arxiv_url"] for item in response_arxiv_urls.data}

# if paper_info_data["paper_id"] in existing_paper_ids:
#     print(f"paper_infoテーブルに既にpaper_id: {paper_info_data['paper_id']} のデータが存在します。挿入をスキップします。")
# elif paper_info_data["arxiv_url"] in existing_arxiv_urls:
#     print(f"paper_infoテーブルに既にarxiv_url: {paper_info_data['arxiv_url']} のデータが存在します。挿入をスキップします。")
# else:
#     insert_response = supabase.table("paper_info").insert(paper_info_data).execute()
#     if insert_response.data:
#         print("paper_info データ挿入成功:", insert_response.data)
#     elif insert_response.error:
#         print("paper_info データ挿入失敗:", insert_response.error)
#     else:
#         print("予期せぬエラーが発生しました。")



# ## feedデータの挿入
# feed_data = {
#     "feed_id": 1,
#     "user_id": 1,
#     "paper_id": 1,
#     "voice": audio_data_base64_string,
#     "gemini_abstract": "this is gemini's abst"
# }

# # 既存のfeed_idを全て取得
# response_feed_ids = supabase.table("feed").select("feed_id").execute()
# existing_feed_ids = {item["feed_id"] for item in response_feed_ids.data}

# if feed_data["feed_id"] not in existing_feed_ids:
#     insert_response = supabase.table("feed").insert(feed_data).execute()
#     if insert_response.data:
#         print("feed データ挿入成功:", insert_response.data)
#     else:
#         print("feed データ挿入失敗:", insert_response.error)
# else:
#     print(f"feedテーブルに既にfeed_id: {feed_data['feed_id']} のデータが存在します。挿入をスキップします。")










# ### データの確認phase ###
# response = supabase.table('bookmark').select('*').execute()
# print(response.data)
# response = supabase.table('user_info').select('*').execute()
# print(response.data)
# response = supabase.table('paper_info').select('*').execute()
# print(response.data)
