import json
import time
from getting_paper import PaperFetcher

def main():
    """
    論文を取得し、結果をJSONファイルとして保存するメイン関数
    """
    # --- 設定項目 ---
    paper_cases = 8000  # 取得したい論文の総数
    output_filename = "papers_data.json" # 出力ファイル名
    # ----------------

    start_time = time.time()
    
    # 1. 論文を取得
    # ★★★ ここを修正: 不要な category 引数を削除 ★★★
    fetcher = PaperFetcher() 
    papers_list = fetcher.fetch_papers(paper_cases)

    if not papers_list:
        print("論文が取得できなかったため、処理を終了します。")
        return

    # 2. 最終結果をJSONファイルとして保存
    print(f"\n取得した全件のデータを '{output_filename}' に保存します。")
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(papers_list, f, indent=2, ensure_ascii=False)
        print("ファイルの保存が成功しました。")
    except Exception as e:
        print(f"ファイルの保存中にエラーが発生しました: {e}")

    end_time = time.time()
    print(f"\n処理時間: {end_time - start_time:.2f} 秒")

if __name__ == "__main__":
    main()
