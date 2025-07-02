"""
backend/modules/arxiv.py

This module provides a client for accessing the arXiv API using the Python 'arxiv' library.
It defines the ArxivClient class, which can perform searches for papers based on a query.
The retrieved information includes title, authors, summary, publication date, and URL.
"""

import sys
from datetime import datetime
from typing import Any, List, Dict, cast

from backend.modules.PaperGetter import Search, SortCriterion

class ArxivClient:
    """
    A client for searching and retrieving paper information from arXiv.

    This client uses the 'arxiv' library to query the arXiv API.
    """

    def search_papers(self, query: str, max_results: int = 10) -> List[Dict[str, str]]:
        """
        Searches for papers matching the given query.

        Args:
            query (str): The search query.
            max_results (int, optional): Maximum number of results to retrieve. Defaults to 10.

        Returns:
            List[Dict[str, str]]: A list of dictionaries, each containing information about a paper.
                Each dictionary includes:
                    - 'title': The paper title.
                    - 'authors': A comma-separated string of authors.
                    - 'summary': The paper summary.
                    - 'published': The publication date as an ISO formatted string.
                    - 'url': The URL to the paper's abstract page.
        """
        # Using cast to explicitly inform the type checker about the search object's type.
        search_obj = cast(Any, Search(
            query=query,
            max_results=max_results,
            sort_by=SortCriterion.SubmittedDate  # type: ignore
        ))  # type: ignore
        results: List[Dict[str, str]] = []
        for result in search_obj.results():  # type: ignore
            paper_info: Dict[str, str] = {
                "title": result.title,  # type: ignore
                "authors": ", ".join(author.name for author in result.authors),  # type: ignore
                "summary": result.summary,  # type: ignore
                "published": result.published.isoformat() if isinstance(result.published, datetime) else str(result.published),  # type: ignore
                "url": result.entry_id  # type: ignore
            }
            results.append(paper_info)
        return results

if __name__ == '__main__':
    # For CLI execution: the first argument is treated as the search query.
    # If no argument is provided, a default query is used.
    query: str = sys.argv[1] if len(sys.argv) > 1 else "machine learning"
    client = ArxivClient()
    papers = client.search_papers(query)
    for paper in papers:
        print("Title:", paper["title"])
        print("Authors:", paper["authors"])
        print("Published:", paper["published"])
        print("URL:", paper["url"])
        print("Summary:", paper["summary"])
        print("-" * 80)
