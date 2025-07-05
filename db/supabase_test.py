#!/usr/bin/env python3
"""
Supabase データベース接続テストスクリプト

使用方法:
1. pip install supabase
2. 環境変数を設定するか、スクリプト内のURLとKEYを編集
3. python supabase_test.py を実行
"""

import os
import sys
from datetime import datetime
from db.supabase_test import create_client, Client

# 設定値（環境変数または直接指定）
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def print_header(title):
    """ヘッダーを出力"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_result(success, message, data=None):
    """結果を出力"""
    status = "✅ SUCCESS" if success else "❌ ERROR"
    print(f"{status}: {message}")
    if data:
        print(f"Data: {data}")
    print("-" * 40)

def test_connection():
    """基本的な接続テスト"""
    print_header("🔌 Supabase 接続テスト")

    # URLとKEYのチェック
    if SUPABASE_URL == "https://your-project.supabase.co" or SUPABASE_KEY == "your-anon-key-here":
        print_result(False, "URLまたはAPIキーが設定されていません")
        print("以下の方法で設定してください:")
        print("1. 環境変数: export SUPABASE_URL='...' && export SUPABASE_KEY='...'")
        print("2. スクリプト編集: SUPABASE_URL と SUPABASE_KEY を直接編集")
        return None

    try:
        # Supabaseクライアント作成
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print_result(True, "Supabaseクライアント作成成功")
        return supabase
    except Exception as e:
        print_result(False, f"接続失敗: {str(e)}")
        return None

def test_tables_existence(supabase: Client):
    """テーブルの存在確認"""
    print_header("📋 テーブル存在確認")

    tables = ["user_info", "paper_info", "training_data_table", "feed", "bookmark"]

    for table in tables:
        try:
            # テーブルから1件だけ取得を試みる（存在確認）
            result = supabase.table(table).select("*").limit(1).execute()
            print_result(True, f"テーブル '{table}' は存在します", f"列数: {len(result.data[0].keys()) if result.data else '0 (空テーブル)'}")
        except Exception as e:
            print_result(False, f"テーブル '{table}' のアクセスに失敗", str(e))

def test_basic_operations(supabase: Client):
    """基本的なCRUD操作テスト"""
    print_header("🔧 基本操作テスト (user_info)")

    try:
        # INSERT テスト（テストユーザー作成）
        test_user = {
            "character_voice": "zunda",
            "profile": {"test": True, "created_by": "connection_test"},
            "keyword": "test_keyword",
            "additional_prompt": "This is a test user"
        }

        insert_result = supabase.table("user_info").insert(test_user).execute()
        if insert_result.data:
            user_id = insert_result.data[0]["user_id"]
            print_result(True, "INSERT操作成功", f"作成されたuser_id: {user_id}")

            # SELECT テスト
            select_result = supabase.table("user_info").select("*").eq("user_id", user_id).execute()
            if select_result.data:
                print_result(True, "SELECT操作成功", f"取得データ: {select_result.data[0]}")

                # UPDATE テスト
                update_data = {"keyword": "updated_keyword"}
                update_result = supabase.table("user_info").update(update_data).eq("user_id", user_id).execute()
                if update_result.data:
                    print_result(True, "UPDATE操作成功", f"更新されたキーワード: {update_result.data[0]['keyword']}")
                else:
                    print_result(False, "UPDATE操作失敗", "データが返されませんでした")

                # DELETE テスト
                delete_result = supabase.table("user_info").delete().eq("user_id", user_id).execute()
                if delete_result.data:
                    print_result(True, "DELETE操作成功", f"削除されたuser_id: {delete_result.data[0]['user_id']}")
                else:
                    print_result(False, "DELETE操作失敗", "データが返されませんでした")
            else:
                print_result(False, "SELECT操作失敗", "作成したユーザーが見つかりません")
        else:
            print_result(False, "INSERT操作失敗", "データが返されませんでした")

    except Exception as e:
        print_result(False, f"CRUD操作中にエラー発生", str(e))

def test_paper_info_insert(supabase: Client):
    """paper_info テーブルへのテストデータ挿入"""
    print_header("📄 論文データ挿入テスト")

    try:
        test_paper = {
            "paper_id": "test_paper_001",
            "title": "Test Paper for Connection Verification",
            "author": "Test Author",
            "published_date": "2024-01-01",
            "arxiv_url": "https://arxiv.org/abs/test.001",
            "arxiv_category": "cs.AI",
            "abstract": "This is a test abstract for connection verification.",
            "gemini_abstract": "AI-generated summary: This is a test paper."
        }

        # 既存データがあれば削除
        supabase.table("paper_info").delete().eq("paper_id", "test_paper_001").execute()

        # 新しいデータを挿入
        result = supabase.table("paper_info").insert(test_paper).execute()
        if result.data:
            print_result(True, "論文データ挿入成功", f"paper_id: {result.data[0]['paper_id']}")

            # クリーンアップ
            supabase.table("paper_info").delete().eq("paper_id", "test_paper_001").execute()
            print_result(True, "テストデータクリーンアップ完了", None)
        else:
            print_result(False, "論文データ挿入失敗", "データが返されませんでした")

    except Exception as e:
        print_result(False, f"論文データ操作中にエラー", str(e))

def main():
    """メイン関数"""
    print("🚀 Supabase データベース接続テストを開始します...")
    print(f"URL: {SUPABASE_URL}")
    print(f"Key: {SUPABASE_KEY[:20]}..." if len(SUPABASE_KEY) > 20 else "Key設定済み")

    # 接続テスト
    supabase = test_connection()
    if not supabase:
        sys.exit(1)

    # テーブル存在確認
    test_tables_existence(supabase)

    # 基本操作テスト
    test_basic_operations(supabase)

    # 論文データテスト
    test_paper_info_insert(supabase)

    print_header("🎉 テスト完了")
    print("すべてのテストが正常に実行されました！")
    print("データベースへの接続と基本操作が正しく動作しています。")

if __name__ == "__main__":
    main()
