#!/usr/bin/env python3
# pyright: ignore-all-errors

# pyright: reportMissingImports=false
import os
import datetime
import uuid

from dotenv import load_dotenv
from typing import Any, Dict

from supabase import create_client, Client  # type: ignore  # pylint: disable=import-error


import inspect


load_dotenv()
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

def save_audio_data():
    # Supabase クライアントを作成
    supabase: Any = create_client(SUPABASE_URL, SUPABASE_KEY)  # type: ignore
    print(supabase)

    # オーディオファイルパス
    file_path = "../backend/data/voices/002_HippoRAG2解説.mp3"

    try:
        # バイナリモードでオーディオファイルを読み込む
        with open(file_path, "rb") as f:
            audio_data = f.read()
            print(type(audio_data))
    except Exception as e:
        print("ファイルの読み込みに失敗しました:", e)
        return

    try:

        # # データの確認．
        # response = supabase.table('bookmark').select('*').execute()
        # print(response.data)
        # response = supabase.table('user_info').select('*').execute()
        # print(response.data)
        # print("ここまでは通った・")


        # # ブックマークデータの挿入
        # response = supabase.table("bookmark").insert({
        #     "bookmark_id": 1,
        #     "user_id": 1,
        #     "title": "Attention Is All You Need",
        #     "author": "Ashish Vaswani et al.",
        #     "url": "https://arxiv.org/abs/1706.03762", # 'email' を 'url' に修正し、値を追加
        #     "references_date": "2025-07-04", # 'reference_date' のスペルを修正
        #     "created_at": datetime.datetime.now().isoformat() + "Z" # 現在時刻をISO 8601形式で追加
        # }).execute()


        # # user infoデータの挿入
        # user_data: Dict[str, Any] = {
        #     "user_id": 1,
        #     "uuid": str(uuid.uuid4()), # UUIDを生成して文字列に変換
        #     "character_voice": "default_voice", # 任意の値を設定
        #     "profile": {"name": "Test User", "age": 30}, # JSONBデータ
        #     "keyword": "test_keyword", # 任意の値を設定
        #     "additional_prompt": "This is an additional prompt for the test user." # 任意の値を設定
        # }

        # # データの確認．
        # response = supabase.table('bookmark').select('*').execute()
        # print(response.data)
        # response = supabase.table('user_info').select('*').execute()
        # print(response.data)

        # 音声ファイルのpoc
        response = supabase.table('feed').select('*').execute()
        print(response.data)
        feed_data: Dict[str, Any] = {
            "feed_id": 1,
            "user_id": 1,
            "paper_id": "1", # データベースの型定義はtextなのでエラーになるはず．
            "voice": audio_data, # ここもバイナリだからエラー出るはず．
            "mp3": audio_data, # ここもバイナリだからエラー出るはず．
            "created_at": datetime.datetime.now().isoformat() + "Z"
        }
        response = supabase.table('feed').select('*').execute()
        print(response.data)






    #     data = getattr(response, "data", None)  # type: ignore
    #     if data:
    #         print("オーディオファイルの保存に成功しました。")
    #     else:
    #         print("データ挿入に失敗しました。レスポンス:", response)  # type: ignore
    except Exception as e:
        print("エラーが発生しました:", e)
if __name__ == "__main__":
    save_audio_data()

