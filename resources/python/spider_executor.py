#!/usr/bin/env python3
"""
MangoBox Spider Executor
Executes TVBox Python spiders via JSON-RPC over stdin/stdout
"""

import sys
import json
import os
import importlib.util
import requests
from typing import Any, Dict, Optional

# Add the resources/python directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

class SpiderRunner:
    def __init__(self):
        self.spiders: Dict[str, Any] = {}

    def load_spider(self, key: str, py_url: str, ext: str = "") -> None:
        """Load a Python spider from URL or local file"""
        try:
            # Import the base spider class
            from base_spider import Spider as BaseSpider

            if py_url.startswith('http'):
                # Download from URL
                response = requests.get(py_url, timeout=30)
                response.raise_for_status()
                code = response.text

                # Create a temporary module
                module_name = f"spider_{key}"
                spec = importlib.util.spec_from_loader(module_name, loader=None)
                module = importlib.util.module_from_spec(spec)

                # Inject the base spider class into the module
                module.__dict__['Spider'] = BaseSpider
                module.__dict__['BaseSpider'] = BaseSpider

                # Execute the code
                exec(code, module.__dict__)
            else:
                # Load from local file
                spec = importlib.util.spec_from_file_location(key, py_url)
                module = importlib.util.module_from_spec(spec)

                # Inject the base spider class
                module.__dict__['Spider'] = BaseSpider
                module.__dict__['BaseSpider'] = BaseSpider

                spec.loader.exec_module(module)

            # Find Spider class in the module
            spider_class = None
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, type) and issubclass(attr, BaseSpider) and attr != BaseSpider:
                    spider_class = attr
                    break

            if not spider_class:
                # Try to find any class named Spider
                spider_class = getattr(module, 'Spider', None)

            if spider_class and isinstance(spider_class, type):
                spider_instance = spider_class()
                spider_instance.init(ext)
                self.spiders[key] = spider_instance
            else:
                raise ValueError(f"No Spider class found in {py_url}")

        except Exception as e:
            raise ValueError(f"Failed to load spider {key}: {str(e)}")

    def call(self, key: str, method: str, params: Dict[str, Any] = None) -> Any:
        """Call a method on a loaded spider"""
        if key not in self.spiders:
            raise ValueError(f"Spider {key} not loaded")

        spider = self.spiders[key]
        func = getattr(spider, method, None)

        if not func:
            raise ValueError(f"Method {method} not found in spider {key}")

        params = params or {}
        return func(**params)

def main():
    runner = SpiderRunner()

    # Read JSON-RPC requests from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
            request_id = request.get('id')
            method = request.get('method')
            params = request.get('params', {})

            # Route to appropriate method
            if method == 'load_spider':
                key = params.get('key')
                py_url = params.get('py_url')
                ext = params.get('ext', '')
                runner.load_spider(key, py_url, ext)
                response = {'id': request_id, 'result': 'ok'}
            elif method == 'destroy':
                key = params.get('key')
                if key in runner.spiders:
                    try:
                        runner.spiders[key].destroy()
                    except:
                        pass
                    del runner.spiders[key]
                response = {'id': request_id, 'result': 'ok'}
            elif method == 'destroy_all':
                for key, spider in runner.spiders.items():
                    try:
                        spider.destroy()
                    except:
                        pass
                runner.spiders.clear()
                response = {'id': request_id, 'result': 'ok'}
            else:
                # Call spider method
                key = params.pop('key', None)
                if not key:
                    raise ValueError("Missing 'key' parameter")

                result = runner.call(key, method, params)
                response = {'id': request_id, 'result': result}

            print(json.dumps(response, ensure_ascii=False), flush=True)

        except Exception as e:
            error_response = {
                'id': request.get('id') if 'request' in dir() else None,
                'error': str(e)
            }
            print(json.dumps(error_response, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
