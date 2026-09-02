"""
SEC-011: Security Headers Middleware
Adds OWASP-recommended HTTP security headers to every response.
These protect against clickjacking, MIME-sniffing, XSS, and information leakage.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, environment: str = "development"):
        super().__init__(app)
        self.environment = environment

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Prevent MIME-type sniffing attacks
        response.headers["X-Content-Type-Options"] = "nosniff"

        # Prevent clickjacking — deny all framing
        response.headers["X-Frame-Options"] = "DENY"

        # Disable legacy XSS filter (modern browsers use CSP instead)
        response.headers["X-XSS-Protection"] = "0"

        # Limit referrer information leakage
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Restrict browser features
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), fullscreen=(self)"
        )

        # Content Security Policy — tight policy for API-only service
        # Allows same-origin scripts and the Vite dev server for the dashboard
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob:; "
            "connect-src 'self' ws://localhost:5173 ws://127.0.0.1:5173; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )

        # HSTS — only send in production to avoid breaking local dev
        if self.environment == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Remove server fingerprinting headers (use del with guard, not .pop)
        for header_name in ("Server", "X-Powered-By"):
            if header_name in response.headers:
                del response.headers[header_name]

        return response
