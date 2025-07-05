

import os
import base64
from dotenv import load_dotenv
from supabase import create_client, Client
import sys

# プロジェクトルートをパスに追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# 依存するモジュールをインポート (クラスを直接インポート)
from backend.poc.arxiv.gemini_summarizer import PaperSummarizer
from backend.poc.voicevox.VoicevoxEngine import VoicevoxClient

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def generate_and_store_feed_for_user(user_id: int, count: int = 30):
    """
    ユーザー専用のフィードを生成し、データベースに保存するバックグラウンドタスク。
    """
    print(f"BACKGROUND: Starting feed generation for user_id: {user_id}")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

        # ユーザーの音声設定を取得 (見つからない場合はデフォルト値3を使用)
        user_info_res = supabase.table("user_info").select("voice_type").eq("user_id", user_id).single().execute()
        voice_type = user_info_res.data.get('voice_type', 3) if user_info_res.data else 3
        
        # 1. このユーザーが既にフィード済みの論文IDリストを取得
        existing_feed_papers_res = supabase.table("feed").select("paper_id").eq("user_id", user_id).execute()
        existing_paper_ids = {item['paper_id'] for item in existing_feed_papers_res.data} if existing_feed_papers_res.data else set()
        
        # 2. 未読の論文をpaper_infoから取得
        query = supabase.table("paper_info").select("*")
        if existing_paper_ids:
            query = query.not_("paper_id", "in", list(existing_paper_ids))
        papers_to_process_res = query.limit(count).execute()
        
        papers_to_process = papers_to_process_res.data
        
        if not papers_to_process:
            print(f"BACKGROUND: No new papers to process for user_id: {user_id}")
            return

        # 新しいfeed_idを決定するため、現在の最大値を取得
        max_feed_id_res = supabase.table("feed").select("feed_id").order("feed_id", desc=True).limit(1).single().execute()
        next_feed_id = (max_feed_id_res.data['feed_id'] + 1) if max_feed_id_res.data else 1

        # 各クラスのインスタンスを生成
        summarizer = PaperSummarizer()
        voice_client = VoicevoxClient()

        # 3. 論文ごとに処理
        for paper in papers_to_process:
            paper_id = paper['paper_id']
            abstract = paper['abstract']
            print(f"BACKGROUND: Processing paper_id: {paper_id} for user_id: {user_id}")
            
            # 3a. 要約を生成
            summary = summarizer.summarize(abstract)
            if not summary or "要約の生成に失敗しました" in summary:
                print(f"BACKGROUND: Failed to generate summary for paper_id: {paper_id}. Skipping.")
                continue
            
            # 3b. 音声合成を実行 (bytesで直接受け取る)
            audio_data = voice_client.synthesize_voice(text=summary, speaker=voice_type)
            if not audio_data:
                print(f"BACKGROUND: Failed to synthesize voice for paper_id: {paper_id}. Skipping.")
                continue

            # 3c. 音声データをBase64にエンコード
            encoded_audio = base64.b64encode(audio_data).decode('utf-8')
            
            # 3d. feedテーブルに保存
            feed_data = {
                "feed_id": next_feed_id,
                "user_id": user_id,
                "paper_id": paper_id,
                "gemini_abstract": summary,
                "voice": encoded_audio
            }
            response = supabase.table("feed").insert(feed_data).execute()
            if response.data:
                print(f"BACKGROUND: Successfully stored feed for paper_id: {paper_id} with new feed_id: {next_feed_id}")
                next_feed_id += 1 # 次のfeed_idをインクリメント
            else:
                print(f"BACKGROUND: Failed to store feed for paper_id: {paper_id}. Error: {response.error}")

    except Exception as e:
        print(f"BACKGROUND ERROR: An unexpected error occurred during feed generation for user_id: {user_id}. Error: {e}")

def add_one_paper_to_feed(user_id: int):
    """論文を1件だけ生成し、feedテーブルに補充する"""
    print(f"BACKGROUND: Adding one paper for user_id: {user_id}")
    try:
        # 既存のgenerate_and_store_feed_for_user関数をcount=1で呼び出す
        generate_and_store_feed_for_user(user_id=user_id, count=1)
        print(f"BACKGROUND: Successfully finished adding one paper for user_id: {user_id}")
    except Exception as e:
        print(f"BACKGROUND ERROR: Failed to add one paper for user_id: {user_id}. Error: {e}")


