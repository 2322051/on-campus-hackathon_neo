

import os
import sys
import time
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import BackgroundTasks, HTTPException

# プロジェクトルートをパスに追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# テスト対象の関数と、その中で使われるヘルパー関数をインポート
from api.api_fb import get_next_feed_item, app # appのインポートを追加
from backend.modules.FeedGenerator import generate_and_store_feed_for_user

# バックグラウンドタスクをテスト内で手動実行するためのカスタムクラス
class TestableBackgroundTasks(BackgroundTasks):
    def __init__(self):
        super().__init__()
        self.tasks = []

    def add_task(self, func, *args, **kwargs):
        print(f"[Test] Background task '{func.__name__}' was added.")
        self.tasks.append((func, args, kwargs))

    def run_all(self):
        print("[Test] Manually running all background tasks...")
        for func, args, kwargs in self.tasks:
            func(*args, **kwargs)
        print("[Test] ...all background tasks finished.")

def run_test():
    """get_next_feed_itemのテストを実行する"""
    load_dotenv()
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("エラー: Supabaseの環境変数が設定されていません。")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    TEST_USER_ID = 9998 # このテスト専用のユーザーID

    print(f"--- テスト開始: user_id={TEST_USER_ID} ---")

    try:
        # --- 準備フェーズ ---
        print("\n--- 1. 準備フェーズ ---")
        # テストユーザー作成
        user_res = supabase.table("user_info").select("user_id").eq("user_id", TEST_USER_ID).execute()
        if not user_res.data:
            supabase.table("user_info").insert({"user_id": TEST_USER_ID, "uuid": str(uuid.uuid4()), "voice_type": 3}).execute()
        
        # 既存のフィードを掃除
        supabase.table("feed").delete().eq("user_id", TEST_USER_ID).execute()
        print("既存のフィードをクリーンアップしました。")

        # フィードを2件、事前に生成
        print("テスト用にフィードを2件、事前に生成します...")
        generate_and_store_feed_for_user(user_id=TEST_USER_ID, count=2)
        
        count_before_res = supabase.table("feed").select("feed_id", count='exact').eq("user_id", TEST_USER_ID).execute()
        count_before = count_before_res.count
        print(f"テスト開始前のfeed件数: {count_before}")
        if count_before < 1:
            print("テスト準備に失敗: paper_infoに未処理の論文がないか、外部APIに問題がある可能性があります。")
            return

        # --- 同期処理テストフェーズ ---
        print("\n--- 2. 同期処理テストフェーズ ---")
        tasks = TestableBackgroundTasks()
        print("get_next_feed_item を呼び出します...")
        returned_item = get_next_feed_item(user_id=TEST_USER_ID, background_tasks=tasks)
        print("get_next_feed_item からレスポンス相当のオブジェクトを受け取りました。")

        assert returned_item is not None, "返却アイテムがNoneです。"
        assert isinstance(returned_item.audio_base64, str) and len(returned_item.audio_base64) > 100, "Base64音声データが不正です。"
        print("[成功] 返却されたFeedItemオブジェクトは正常です。")

        count_after_call_res = supabase.table("feed").select("feed_id", count='exact').eq("user_id", TEST_USER_ID).execute()
        count_after_call = count_after_call_res.count
        print(f"API呼び出し直後のfeed件数: {count_after_call}")
        assert count_after_call == count_before - 1, "feedが1件削除されていません。"
        print("[成功] feedテーブルから1件削除されました。")

        # --- 非同期処理テストフェーズ ---
        print("\n--- 3. 非同期処理テストフェーズ ---")
        tasks.run_all() # バックグラウンドタスクを手動で実行

        # 少し待機してDBの反映を待つ
        time.sleep(5)

        count_after_bg_res = supabase.table("feed").select("feed_id", count='exact').eq("user_id", TEST_USER_ID).execute()
        count_after_bg = count_after_bg_res.count
        print(f"補充処理後のfeed件数: {count_after_bg}")
        assert count_after_bg == count_before, "feedが1件補充されていません。"
        print("[成功] feedテーブルに1件補充され、件数が元に戻りました。")

    except HTTPException as he:
        print(f"テスト中にHTTP例外が発生しました: status_code={he.status_code}, detail={he.detail}")
    except Exception as e:
        import traceback
        print(f"テスト中に予期せぬエラーが発生しました: {e}")
        traceback.print_exc()
    finally:
        # --- クリーンアップフェーズ ---
        print("\n--- 4. クリーンアップフェーズ ---")
        supabase.table("feed").delete().eq("user_id", TEST_USER_ID).execute()
        supabase.table("user_info").delete().eq("user_id", TEST_USER_ID).execute()
        print(f"テストユーザー(id={TEST_USER_ID})関連のデータを削除しました。")
        print("\n--- テスト終了 ---")

if __name__ == "__main__":
    run_test()

