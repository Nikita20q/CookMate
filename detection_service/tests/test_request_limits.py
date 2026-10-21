import unittest
from unittest.mock import AsyncMock
from request_limits import RequestSizeLimit


class RequestLimitTests(unittest.IsolatedAsyncioTestCase):
    async def exercise(self, chunks, headers=(), limit=8):
        receive = AsyncMock(side_effect=[
            {"type": "http.request", "body": part, "more_body": i < len(chunks) - 1}
            for i, part in enumerate(chunks)
        ])
        send = AsyncMock()
        downstream = AsyncMock()
        await RequestSizeLimit(downstream, limit)({"type": "http", "headers": headers}, receive, send)
        return downstream, receive, send

    async def test_exact_limit_allowed_and_body_replayed(self):
        downstream, _, send = await self.exercise([b"1234", b"5678"])
        downstream.assert_awaited_once()
        replay = downstream.call_args.args[1]
        self.assertEqual((await replay())["body"], b"1234")
        self.assertEqual((await replay())["body"], b"5678")
        send.assert_not_awaited()

    async def test_chunked_over_limit_rejected_before_app(self):
        downstream, _, send = await self.exercise([b"1234", b"56789"])
        downstream.assert_not_awaited()
        self.assertEqual(send.call_args_list[0].args[0]["status"], 413)

    async def test_forged_content_length_does_not_bypass_limit(self):
        downstream, _, send = await self.exercise([b"123456789"], [(b"content-length", b"1")])
        downstream.assert_not_awaited()
        self.assertEqual(send.call_args_list[0].args[0]["status"], 413)

    async def test_read_stops_as_soon_as_limit_exceeded(self):
        downstream, receive, _ = await self.exercise([b"123456789", b"unread"])
        self.assertEqual(receive.await_count, 1)
        downstream.assert_not_awaited()

    async def test_disconnect_does_not_call_app(self):
        downstream = AsyncMock()
        await RequestSizeLimit(downstream)({"type": "http"}, AsyncMock(return_value={"type": "http.disconnect"}), AsyncMock())
        downstream.assert_not_awaited()

    async def test_lifespan_passed_through(self):
        downstream, receive, send = AsyncMock(), AsyncMock(), AsyncMock()
        scope = {"type": "lifespan"}
        await RequestSizeLimit(downstream)(scope, receive, send)
        downstream.assert_awaited_once_with(scope, receive, send)
        receive.assert_not_awaited()
