#!/usr/bin/env python3
"""
MangoBox Spider Executor
Executes TVBox Python spiders via JSON-RPC over stdin/stdout
"""

import sys
import json
import importlib.util
import importlib
import requests
from typing import Any, Dict, Optional

class SpiderRunner:
    def __init__(self):
        self.spiders: Dict[str, Any] = {}

    def load_spider(self, key: str, py_url: str) -> None:
        """Load a Python spider from URL or local file"""
        try:
            if py_url.startswith('http'):
                # Download from URL
                response = requests.get(py_url, timeout=10)
                response.raise_for_status()
                code = response.text

                # Create a module and execute the code
                module_name = f"spider_{key}"
                spec = importlib.util.spec_from_loader(module_name, loader=None)
                module = importlib.util.module_from_spec(spec)
                exec(code, module.__dict__)
            else:
                # Load from local file
                spec = importlib.util.spec_from_file_location(key, py_url)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

            # Find Spider class in the module
            spider_class = None
            for attr_name in dir(module):
                attr = getattr(module, attr_name)
                if isinstance(attr, type) and attr_name == 'Spider':
                    spider_class = attr
                    break

            if not spider_class:
                # Try to find any class that looks like a Spider
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if isinstance(attr, type) and hasattr(attr, 'homeContent'):
                        spider_class = attr
                        break

            if spider_class:
                self.spiders[key] = spider_class()
                # Call init if it exists
                if hasattr(self.spiders[key], 'init'):
                    self.spiders[key].init()
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
                result = runner.load_spider(params['key'], params['py_url'])
                response = {'id': request_id, 'result': 'ok'}
            elif method == 'destroy':
                key = params.get('key')
                if key in runner.spiders:
                    if hasattr(runner.spiders[key], 'destroy'):
                        runner.spiders[key].destroy()
                    del runner.spiders[key]
                response = {'id': request_id, 'result': 'ok'}
            else:
                # Call spider method
                key = params.pop('key', None)
                if not key:
                    raise ValueError("Missing 'key' parameter")

                result = runner.call(key, method, params)
                response = {'id': request_id, 'result': result}

            print(json.dumps(response), flush=True)

        except Exception as e:
            error_response = {
                'id': request.get('id') if 'request' in dir() else None,
                'error': str(e)
            }
            print(json.dumps(error_response), flush=True)

if __name__ == '__main__':
    main()
