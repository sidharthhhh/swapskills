import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants.dart';

// Conditional import for web
import 'storage_stub.dart' if (dart.library.html) 'storage_web.dart' as platform_storage;

/// Provider for the SecureStorageService singleton.
final secureStorageServiceProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// Storage service that works on both web and mobile.
/// On web: uses localStorage directly (no encryption needed for dev).
/// On mobile: uses flutter_secure_storage.
class SecureStorageService {
  final Map<String, String> _memoryCache = {};

  // --- Access Token ---

  Future<String?> getAccessToken() async {
    if (_memoryCache.containsKey(AppConstants.accessTokenKey)) {
      return _memoryCache[AppConstants.accessTokenKey];
    }
    final value = platform_storage.read(AppConstants.accessTokenKey);
    if (value != null) _memoryCache[AppConstants.accessTokenKey] = value;
    return value;
  }

  Future<void> saveAccessToken(String token) async {
    _memoryCache[AppConstants.accessTokenKey] = token;
    platform_storage.write(AppConstants.accessTokenKey, token);
  }

  Future<void> deleteAccessToken() async {
    _memoryCache.remove(AppConstants.accessTokenKey);
    platform_storage.delete(AppConstants.accessTokenKey);
  }

  // --- Refresh Token ---

  Future<String?> getRefreshToken() async {
    if (_memoryCache.containsKey(AppConstants.refreshTokenKey)) {
      return _memoryCache[AppConstants.refreshTokenKey];
    }
    final value = platform_storage.read(AppConstants.refreshTokenKey);
    if (value != null) _memoryCache[AppConstants.refreshTokenKey] = value;
    return value;
  }

  Future<void> saveRefreshToken(String token) async {
    _memoryCache[AppConstants.refreshTokenKey] = token;
    platform_storage.write(AppConstants.refreshTokenKey, token);
  }

  Future<void> deleteRefreshToken() async {
    _memoryCache.remove(AppConstants.refreshTokenKey);
    platform_storage.delete(AppConstants.refreshTokenKey);
  }

  // --- Utility ---

  Future<void> clearTokens() async {
    _memoryCache.clear();
    platform_storage.delete(AppConstants.accessTokenKey);
    platform_storage.delete(AppConstants.refreshTokenKey);
  }

  Future<void> clearAll() async {
    _memoryCache.clear();
    platform_storage.deleteAll();
  }
}
