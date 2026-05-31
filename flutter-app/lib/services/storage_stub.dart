/// Stub implementation for non-web platforms.
/// On mobile, you'd use flutter_secure_storage here instead.
/// For now this uses a simple in-memory map as fallback.

final Map<String, String> _store = {};

String? read(String key) {
  return _store[key];
}

void write(String key, String value) {
  _store[key] = value;
}

void delete(String key) {
  _store.remove(key);
}

void deleteAll() {
  _store.clear();
}
