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

def save_audio_data():
    # Supabase クライアントを作成
    supabase: Any = create_client(SUPABASE_URL, SUPABASE_KEY)  # type: ignore
    print(supabase)

    # オーディオファイルパス
    file_path = "../backend/data/voices/002_HippoRAG2解説.mp3"

    try:
        # バイナリモードでオーディオファイルを読み込む
        with open(file_path, "rb") as f:
            audio_data_bytes = f.read()
            print(type(audio_data_bytes))
        audio_data_base64_string = base64.b64encode(audio_data_bytes).decode('utf-8')
    except Exception as e:
        print("ファイルの読み込みに失敗しました:", e)
        return

    try:

        # データの確認．
        response = supabase.table('bookmark').select('*').execute()
        print(response.data)
        response = supabase.table('user_info').select('*').execute()
        print(response.data)
        response = supabase.table('feed').select('*').execute()
        print(response.data)
        response = supabase.table('paper_info').select('*').execute()
        print(response.data)
        print("既存のテーブルの中身を確認．")



        # user infoデータの挿入
        user_info_data = {
            "user_id": 1,
            "uuid": str(uuid.uuid4()), # UUIDを生成して文字列に変換
            "voice_type": 1, # 任意の値を設定
            "profile": {"name": "Test User", "age": 30}, # JSONBデータ
            "keyword": "RAG", # 任意の値を設定
            "additional_prompt": "This is an additional prompt for the test user." # 任意の値を設定
        }
        insert_response = supabase.table("user_info").insert(user_info_data).execute()
        if insert_response.data:
            print("データ挿入成功:", insert_response.data)
        else:
            print("データ挿入失敗:", insert_response.error)


        # ブックマークデータの挿入
        book_mark_data = {
            "bookmark_id": 1,
            "user_id": 1,
            "title": "Attention Is All You Need",
            "author": "Ashish Vaswani et al.",
            "url": "https://arxiv.org/abs/1706.03762", # 'email' を 'url' に修正し、値を追加
            "references_date": "2025-07-04", # 'reference_date' のスペルを修正
        }
        insert_response = supabase.table("bookmark").insert(book_mark_data).execute()
        if insert_response.data:
            print("データ挿入成功:", insert_response.data)
        else:
            print("データ挿入失敗:", insert_response.error)



        # 音声ファイルのpoc
        paper_info_data = {
            "paper_id": 1,
            "title": "Attention Is All You Need",
            "author": "Ashish Vaswani et al.",
            "published_data": "2017-6-12",
            "arxiv_url": "https://arxiv.org/abs/1706.03762",
            "arxiv_category": "CS",
            "abstract": "this is abst",
            "gemini_abstract": "this is gemini's abst",
            "created_at": datetime.datetime.now().isoformat() + "Z"
        }
        insert_response = supabase.table("paper_info").insert(paper_info_data).execute()
        if insert_response.data:
            print("データ挿入成功:", insert_response.data)
        else:
            print("データ挿入失敗:", insert_response.error)


        # 音声ファイルのpoc
        feed_data = {
            "feed_id": 1,
            "user_id": 1,
            "paper_id": 1,
            "voice": audio_data_base64_string,
        }
        insert_response = supabase.table("feed").insert(feed_data).execute()
        if insert_response.data:
            print("データ挿入成功:", insert_response.data)
        else:
            print("データ挿入失敗:", insert_response.error)



        # データの確認．
        response = supabase.table('bookmark').select('*').execute()
        # print(response.data)
        response = supabase.table('user_info').select('*').execute()
        # print(response.data)
        response = supabase.table('paper_info').select('*').execute()
        # print(response.data)


        # voiceデータをデータベースから取得して，デコードしてmp3に変換．
        response = supabase.table('feed').select('*').execute()
        data = response.data
        encoded_voice = data[0]['voice']
        decoded_audio_data_bytes = base64.b64decode(audio_data_base64_string)
        output_file_path = "../backend/data/voices/reconverted_audio.mp3"
        try:
            with open(output_file_path, "wb") as f:
                f.write(decoded_audio_data_bytes)
            print(f"MP3ファイルが '{output_file_path}' として正常に再変換されました。")
        except Exception as e:
            print(f"ファイルの書き込み中にエラーが発生しました: {e}")






    #     data = getattr(response, "data", None)  # type: ignore
    #     if data:
    #         print("オーディオファイルの保存に成功しました。")
    #     else:
    #         print("データ挿入に失敗しました。レスポンス:", response)  # type: ignore
    except Exception as e:
        print("エラーが発生しました:", e)
if __name__ == "__main__":
    save_audio_data()
