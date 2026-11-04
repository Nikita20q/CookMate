"""Bound actual HTTP body bytes before multipart parsing, including chunked input."""
import json
from validation import MAX_REQUEST_BYTES


class RequestSizeLimit:
    def __init__(self, app, max_bytes=MAX_REQUEST_BYTES):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > self.max_bytes:
                body = json.dumps({"detail": "Превышен допустимый размер запроса"}, ensure_ascii=False).encode()
                await send({"type": "http.response.start", "status": 413,
                            "headers": [(b"content-type", b"application/json")]})
                await send({"type": "http.response.body", "body": body})
                return
            chunks.append(message)
            if not message.get("more_body", False):
                break
        iterator = iter(chunks)

        async def replay():
            message = next(iterator, None)
            return message if message is not None else await receive()

        await self.app(scope, replay, send)
