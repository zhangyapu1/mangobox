"""
Base Spider class for TVBox Python spiders
This provides the interface that all Python spiders should implement
"""

import requests
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class Spider(ABC):
    """Base Spider class that all TVBox Python spiders should inherit from"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })

    def init(self, extend: str = ""):
        """Initialize the spider with optional extension data"""
        pass

    def getName(self) -> str:
        """Return the name of this spider"""
        return self.__class__.__name__

    def isVideoFormat(self, url: str) -> bool:
        """Check if the URL is a video format"""
        video_extensions = ['.m3u8', '.mp4', '.flv', '.ts', '.mkv', '.avi']
        return any(ext in (url or '') for ext in video_extensions)

    def manualVideoCheck(self) -> bool:
        """Whether manual video check is needed"""
        return False

    def destroy(self):
        """Cleanup resources"""
        self.session.close()

    @abstractmethod
    def homeContent(self, filter: bool) -> Dict[str, Any]:
        """
        Get home page content

        Returns:
            {
                'class': [{'type_name': str, 'type_id': str}, ...],
                'list': [{'vod_id': str, 'vod_name': str, 'vod_pic': str, 'vod_remarks': str}, ...]
            }
        """
        pass

    @abstractmethod
    def homeVideoContent(self) -> Dict[str, Any]:
        """
        Get home page video content

        Returns:
            {
                'list': [{'vod_id': str, 'vod_name': str, 'vod_pic': str, 'vod_remarks': str}, ...]
            }
        """
        pass

    @abstractmethod
    def categoryContent(self, tid: str, pg: str, filter: bool, extend: Dict[str, str]) -> Dict[str, Any]:
        """
        Get category content

        Args:
            tid: Category ID
            pg: Page number (string)
            filter: Whether to apply filters
            extend: Additional filter parameters

        Returns:
            {
                'list': [{'vod_id': str, 'vod_name': str, 'vod_pic': str, 'vod_remarks': str}, ...],
                'page': int,
                'pagecount': int,
                'limit': int,
                'total': int
            }
        """
        pass

    @abstractmethod
    def detailContent(self, ids: List[str]) -> Dict[str, Any]:
        """
        Get video detail

        Args:
            ids: List of video IDs

        Returns:
            {
                'list': [{
                    'vod_id': str,
                    'vod_name': str,
                    'vod_pic': str,
                    'vod_actor': str,
                    'vod_director': str,
                    'vod_content': str,
                    'vod_play_from': str,  # Source names separated by $$$
                    'vod_play_url': str,   # Episodes separated by # and $$$
                    'vod_year': str,
                    'vod_area': str,
                    'type_name': str
                }]
            }
        """
        pass

    def playerContent(self, flag: str, id: str, vipFlags: List[str]) -> Dict[str, Any]:
        """
        Get player content (play URL)

        Args:
            flag: Source flag
            id: Video/episode ID or URL
            vipFlags: List of VIP flags

        Returns:
            {
                'parse': 0,  # 0=direct play, 1=need parse
                'url': str,  # Play URL
                'header': dict  # Optional headers
            }
        """
        return {'parse': 0, 'url': id}

    @abstractmethod
    def searchContent(self, key: str, quick: bool, pg: str = "1") -> Dict[str, Any]:
        """
        Search for videos

        Args:
            key: Search keyword
            quick: Whether this is a quick search
            pg: Page number (string)

        Returns:
            {
                'list': [{'vod_id': str, 'vod_name': str, 'vod_pic': str, 'vod_remarks': str}, ...]
            }
        """
        pass

    def searchContentPage(self, key: str, quick: bool, pg: str = "1") -> Dict[str, Any]:
        """
        Search for videos with pagination (optional, defaults to searchContent)
        """
        return self.searchContent(key, quick, pg)

    def proxy(self, params: Dict[str, str]) -> Any:
        """
        Handle proxy requests

        Args:
            params: Proxy parameters

        Returns:
            [status_code, content_type, data]
        """
        return [200, 'text/plain', '']

    def action(self, action: str) -> str:
        """
        Handle custom actions

        Args:
            action: Action string

        Returns:
            Response string
        """
        return ''

    def liveContent(self, url: str) -> str:
        """
        Get live content

        Args:
            url: Live URL

        Returns:
            Live content string
        """
        return ''

    def fetch(self, url: str, headers: dict = None, timeout: int = 15) -> requests.Response:
        """Helper method to fetch URL"""
        return self.session.get(url, headers=headers, timeout=timeout)

    def post(self, url: str, data: dict = None, json: dict = None, headers: dict = None, timeout: int = 15) -> requests.Response:
        """Helper method to POST URL"""
        return self.session.post(url, data=data, json=json, headers=headers, timeout=timeout)
