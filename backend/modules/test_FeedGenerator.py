import os
import sys
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

# プロジェクトルートをパスに追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.modules.FeedGenerator import generate_and_store_feed_for_user

def run_test():
    """FeedGeneratorのテストを実行する"""
    load_dotenv()
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

    if not all([SUPABASE_URL, SUPABASE_KEY]):
        print("エラー: Supabaseの環境変数が設定されていません。")
        return

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # --- テスト準備 ---
    TEST_USER_ID = 9999 # テスト専用のユーザーID
    print(f"--- テスト開始: user_id={TEST_USER_ID} ---")

    # 1. テストユーザーが存在するか確認し、なければ作成
    import uuid

# (... 省略 ...)
    try:
        user_res = supabase.table("user_info").select("user_id").eq("user_id", TEST_USER_ID).execute()
        if not user_res.data:
            print(f"テストユーザー(id={TEST_USER_ID})が存在しないため、新規作成します。")
            # uuid.uuid4() を使って正しいUUIDを生成する
            supabase.table("user_info").insert({"user_id": TEST_USER_ID, "uuid": str(uuid.uuid4()), "voice_type": 3}).execute()
        else:
            print(f"テストユーザー(id={TEST_USER_ID})は既に存在します。")

        # 2. 実行前のfeedテーブルの状態を確認
        feed_before_res = supabase.table("feed").select("feed_id", count='exact').eq("user_id", TEST_USER_ID).execute()
        count_before = feed_before_res.count
        print(f"テスト実行前のfeed件数: {count_before}")

        # 3. paper_infoテーブルにテスト対象の論文があるか確認
        paper_res = supabase.table("paper_info").select("paper_id", count='exact').execute()
        if not paper_res.count or paper_res.count == 0:
            print("警告: paper_infoテーブルに論文データがありません。テストをスキップします。")
            return
        print(f"paper_infoテーブルには{paper_res.count}件の論文が存在します。")

    except Exception as e:
        print(f"テスト準備中にエラーが発生しました: {e}")
        return

    # --- テスト実行 ---
    print("\ngenerate_and_store_feed_for_user を実行します...")
    # この関数は同期的なので、そのまま呼び出す
    generate_and_store_feed_for_user(user_id=TEST_USER_ID, count=5) # テストなので件数を5に減らす
    print("\n... generate_and_store_feed_for_user の実行が完了しました。")

    # --- 結果検証 ---
    try:
        print("\n結果を検証します...")
        feed_after_res = supabase.table("feed").select("feed_id", count='exact').eq("user_id", TEST_USER_ID).execute()
        count_after = feed_after_res.count
        print(f"テスト実行後のfeed件数: {count_after}")

        newly_added_count = count_after - count_before
        print(f"新たに追加されたfeed件数: {newly_added_count}")

        if newly_added_count > 0:
            print("\n[成功] feedテーブルに新しいデータが追加されました。")
        else:
            print("\n[失敗] feedテーブルに新しいデータは追加されませんでした。")
            print("考えられる原因:")
            print("- paper_infoの論文が全て処理済みである")
            print("- VOICEVOXエンジンが起動していない")
            print("- Gemini APIキーが正しくない")
            print("- データベースの接続情報が正しくない")

    except Exception as e:
        print(f"結果検証中にエラーが発生しました: {e}")

    print("\n--- テスト終了 ---")

if __name__ == "__main__":
    run_test()
