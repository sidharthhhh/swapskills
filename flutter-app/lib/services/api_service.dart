import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/constants.dart';
import 'secure_storage_service.dart';

/// Provider for the ApiService singleton.
final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService(ref);
});

/// API service wrapping Dio with automatic token injection and refresh logic.
///
/// On 401 responses, the interceptor attempts to refresh the access token
/// using the stored refresh token. If refresh succeeds, the original request
/// is retried. If refresh fails, tokens are cleared and the user must
/// re-authenticate.
class ApiService {
  late final Dio dio;
  final Ref _ref;
  bool _isRefreshing = false;

  ApiService(this._ref) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConstants.apiBaseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: _onRequest,
        onError: _onError,
      ),
    );
  }

  /// Attach access token to every outgoing request.
  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final storage = _ref.read(secureStorageServiceProvider);
    final token = await storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  /// Handle 401 errors by attempting token refresh before failing.
  Future<void> _onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    if (error.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshed = await _attemptTokenRefresh();
        if (refreshed) {
          // Retry the original request with the new token.
          final storage = _ref.read(secureStorageServiceProvider);
          final newToken = await storage.getAccessToken();
          final requestOptions = error.requestOptions;
          requestOptions.headers['Authorization'] = 'Bearer $newToken';

          final response = await dio.fetch(requestOptions);
          handler.resolve(response);
          return;
        }
      } catch (_) {
        // Refresh failed — clear tokens and propagate the error.
        final storage = _ref.read(secureStorageServiceProvider);
        await storage.clearTokens();
      } finally {
        _isRefreshing = false;
      }
    }
    handler.next(error);
  }

  /// Attempt to refresh the access token using the stored refresh token.
  /// Returns true if refresh succeeded, false otherwise.
  Future<bool> _attemptTokenRefresh() async {
    final storage = _ref.read(secureStorageServiceProvider);
    final refreshToken = await storage.getRefreshToken();

    if (refreshToken == null) return false;

    try {
      // Use a separate Dio instance to avoid interceptor loops.
      final refreshDio = Dio(
        BaseOptions(
          baseUrl: AppConstants.apiBaseUrl,
          connectTimeout: AppConstants.connectTimeout,
          receiveTimeout: AppConstants.receiveTimeout,
        ),
      );

      final response = await refreshDio.post(
        '/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        await storage.saveAccessToken(data['accessToken'] as String);
        await storage.saveRefreshToken(data['refreshToken'] as String);
        return true;
      }
    } catch (_) {
      // Refresh request failed.
    }

    // Refresh failed — clear stored tokens.
    await storage.clearTokens();
    return false;
  }
}
