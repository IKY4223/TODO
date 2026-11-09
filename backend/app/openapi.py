"""Print the OpenAPI schema. The frontend generates its TypeScript types from it."""

import json

from app.main import app

print(json.dumps(app.openapi(), indent=2))
