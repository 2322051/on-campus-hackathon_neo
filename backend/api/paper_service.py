"""
backend/api/hoge.py

This module simulates database operations by:
1. Reading paper data from a dummy database,
2. Processing each paper by generating a summary via the ContentSummarizer module,
3. Updating the dummy database with the new summary.

The paper data is validated using the Pydantic schema defined in backend/schemas/paper.py.
This implementation is extendable for future integration with a real database.
"""

import json
from ..modules.PaperGetter import PaperGetter
from ..modules.PaperSummarizer import PaperSummarizer

def main():
    """
    処理全体を統括するメイン関数
    """
    # ★★★ キーワード空のテスト用にダミーデータを変更 ★★★
    dummy_keyword = "" 
    dummy_additional_prompt = "ずんだもんみたいな口調で要約してください。語尾には「〜なのだ。」"

    print(f"処理開始: キーワード='{dummy_keyword or '(指定なし)'}'")

    paper_getter = PaperGetter()
    paper_summarizer = PaperSummarizer()

    paper_data = paper_getter.fetch_by_keyword(dummy_keyword)
    
    if not paper_data:
        print("\n処理を終了します。")
        return

    print(f"\n論文取得成功: {paper_data['title']}")

    summary = paper_summarizer.summarize(
        abstract=paper_data["abstract_original"],
        additional_prompt=dummy_additional_prompt
    )
    paper_data["summary_japanese"] = summary
    
    print("\n要約生成成功。")

    # ★★★ 最終データの表示方法を修正 ★★★
    print("\n--- 処理完了: 最終データ ---")
    # json.dumpsを使って、日本語もきれいに表示されるように設定
    final_json_output = json.dumps(paper_data, indent=2, ensure_ascii=False)
    print(final_json_output)
    print("--------------------------")

if __name__ == "__main__":
    main()