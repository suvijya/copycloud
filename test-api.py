import urllib.request
import json
import uuid

import os
BASE = os.environ.get("BASE", "http://127.0.0.1:3001")

def api(method, path, data=None, token=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

passed = 0
total = 0

def test(name, result, expected_key=None):
    global passed, total
    total += 1
    if expected_key and expected_key in result and result.get("success", False):
        passed += 1
        print(f"  ✅ {name}")
    elif not expected_key and result:
        passed += 1
        print(f"  ✅ {name}")
    else:
        print(f"  ❌ {name}: {result}")

print("=" * 40)
print(" CopyCloud API Test Suite")
print("=" * 40)

# 1. Health
print("\n1. Health Check")
r = api("GET", "/health")
test("Health endpoint", r)

# 2. Register with unique email
email = f"test{uuid.uuid4().hex[:8]}@test.com"
print(f"\n2. Auth - Register ({email})")
r = api("POST", "/api/auth/register", {"email": email, "password": "pass123"})
test("Register new user", r, "token")
token = r.get("token", "")
user_id = r.get("user", {}).get("id", "")
print(f"     User: {user_id}")
print(f"     Token: {token[:30]}...")

# 3. Login
print("\n3. Auth - Login")
r = api("POST", "/api/auth/login", {"email": email, "password": "pass123"})
test("Login existing user", r, "token")
# Use the latest token from login
token = r.get("token", token)
print(f"     Token: {token[:30]}...")

# 4. Add Clipboard
print("\n4. Clipboard - Add")
r = api("POST", "/api/clipboard", {
    "content_type": "text",
    "encrypted_content": "Hello World!",
    "metadata": {"size": 12},
    "device_id": "device-1"
}, token)
test("Add clipboard item", r, "data")
clip_id = r.get("data", {}).get("id", "")
print(f"     Clip ID: {clip_id}")

# 5. Get Clipboard
print("\n5. Clipboard - Get All")
r = api("GET", "/api/clipboard", token=token)
test("Get clipboard items", r, "data")
count = len(r.get("data", []))
print(f"     Items: {count}")

# 6. Pin Clipboard
print("\n6. Clipboard - Pin")
r = api("PATCH", f"/api/clipboard/{clip_id}/pin", data={}, token=token)
test("Pin clipboard item", r, "data")
pinned = r.get("data", {}).get("metadata", {}).get("pinned", False)
print(f"     Pinned: {pinned}")

# 7. Delete Clipboard
print("\n7. Clipboard - Delete")
r = api("DELETE", f"/api/clipboard/{clip_id}", token=token)
test("Delete clipboard item", r)

# 8. Register Device
print("\n8. Device - Register")
r = api("POST", "/api/devices/register", {
    "name": "My PC",
    "platform": "windows"
}, token)
test("Register device", r, "data")
dev_id = r.get("data", {}).get("id", "")
print(f"     Device ID: {dev_id}")

# 9. Get Devices
print("\n9. Device - Get All")
r = api("GET", "/api/devices", token=token)
test("Get devices", r, "data")
print(f"     Devices: {len(r.get('data', []))}")

# 10. Update Device Status
print("\n10. Device - Update Status")
r = api("PATCH", f"/api/devices/{dev_id}/status", {"is_online": False}, token)
test("Update device status", r, "data")

# 11. Delete Device
print("\n11. Device - Delete")
r = api("DELETE", f"/api/devices/{dev_id}", token=token)
test("Delete device", r)

# Summary
print("\n" + "=" * 40)
print(f" Results: {passed}/{total} tests passed")
if passed == total:
    print(" ALL TESTS PASSED! ✅")
else:
    print(f" {total - passed} tests failed ❌")
print("=" * 40)