import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';
import '../../../services/secure_storage_service.dart';

/// Represents the current authentication state.
sealed class AuthState {
  const AuthState();
}

class AuthAuthenticated extends AuthState {
  final String userId;
  final String username;

  const AuthAuthenticated({required this.userId, required this.username});
}

class AuthUnauthenticated extends AuthState {
  final String? error;

  const AuthUnauthenticated({this.error});
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

/// Result returned after a successful registration.
class RegisterResult {
  final String username;
  final String recoveryKey;

  const RegisterResult({required this.username, required this.recoveryKey});
}

/// Riverpod AsyncNotifier managing authentication state.
final authProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    return await _silentAuth();
  }

  /// Attempt silent authentication using a stored refresh token.
  Future<AuthState> _silentAuth() async {
    final storage = ref.read(secureStorageServiceProvider);
    final refreshToken = await storage.getRefreshToken();

    if (refreshToken == null) {
      return const AuthUnauthenticated();
    }

    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        await storage.saveAccessToken(data['accessToken'] as String);
        await storage.saveRefreshToken(data['refreshToken'] as String);

        // We don't get user info from refresh, so mark as authenticated
        // with minimal info. The app can fetch profile separately.
        return const AuthAuthenticated(userId: '', username: '');
      }
    } catch (_) {
      // Silent auth failed — clear stale tokens.
      await storage.clearTokens();
    }

    return const AuthUnauthenticated();
  }

  /// Attempt silent auth (public method for retry scenarios).
  Future<void> silentAuth() async {
    state = const AsyncValue.data(AuthLoading());
    final result = await _silentAuth();
    state = AsyncValue.data(result);
  }

  /// Log in with username and password.
  Future<void> login(String username, String password) async {
    state = const AsyncValue.data(AuthLoading());

    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/auth/login',
        data: {'username': username, 'password': password},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final storage = ref.read(secureStorageServiceProvider);

        await storage.saveAccessToken(data['accessToken'] as String);
        await storage.saveRefreshToken(data['refreshToken'] as String);

        final user = data['user'];
        state = AsyncValue.data(
          AuthAuthenticated(
            userId: user['id']?.toString() ?? user['uid']?.toString() ?? '',
            username: user['username'] as String? ?? '',
          ),
        );
      } else {
        state = const AsyncValue.data(
          AuthUnauthenticated(error: 'Invalid credentials'),
        );
      }
    } on DioException catch (e) {
      final message = _extractErrorMessage(e);
      state = AsyncValue.data(AuthUnauthenticated(error: message));
    } catch (_) {
      state = const AsyncValue.data(
        AuthUnauthenticated(error: 'An unexpected error occurred'),
      );
    }
  }

  /// Register a new account. Returns the generated username and recovery key.
  Future<RegisterResult?> register(String password) async {
    state = const AsyncValue.data(AuthLoading());

    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/auth/register',
        data: {'password': password},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (response.data['success'] == true) {
          final data = response.data['data'];
          final storage = ref.read(secureStorageServiceProvider);

          await storage.saveAccessToken(data['accessToken'] as String);
          await storage.saveRefreshToken(data['refreshToken'] as String);

          final username = data['username'] as String? ?? '';
          final recoveryKey = data['recoveryKey'] as String? ?? '';

          state = AsyncValue.data(
            AuthAuthenticated(
              userId: data['uid']?.toString() ?? data['id']?.toString() ?? '',
              username: username,
            ),
          );

          return RegisterResult(username: username, recoveryKey: recoveryKey);
        }
      }

      state = const AsyncValue.data(
        AuthUnauthenticated(error: 'Registration failed'),
      );
      return null;
    } on DioException catch (e) {
      final message = _extractErrorMessage(e);
      state = AsyncValue.data(AuthUnauthenticated(error: message));
      return null;
    } catch (_) {
      state = const AsyncValue.data(
        AuthUnauthenticated(error: 'An unexpected error occurred'),
      );
      return null;
    }
  }

  /// Log out the current user, clear tokens, and notify the backend.
  Future<void> logout() async {
    final storage = ref.read(secureStorageServiceProvider);

    try {
      final api = ref.read(apiServiceProvider);
      await api.dio.post('/api/auth/logout');
    } catch (_) {
      // Best-effort logout notification to backend.
    }

    await storage.clearTokens();
    state = const AsyncValue.data(AuthUnauthenticated());
  }

  /// Refresh the access token using the stored refresh token.
  Future<bool> refreshToken() async {
    final storage = ref.read(secureStorageServiceProvider);
    final refreshTokenValue = await storage.getRefreshToken();

    if (refreshTokenValue == null) {
      state = const AsyncValue.data(AuthUnauthenticated());
      return false;
    }

    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/auth/refresh',
        data: {'refreshToken': refreshTokenValue},
      );

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        await storage.saveAccessToken(data['accessToken'] as String);
        await storage.saveRefreshToken(data['refreshToken'] as String);
        return true;
      }
    } catch (_) {
      await storage.clearTokens();
      state = const AsyncValue.data(AuthUnauthenticated());
    }

    return false;
  }

  /// Extract a user-friendly error message from a DioException.
  String _extractErrorMessage(DioException e) {
    if (e.response?.data is Map) {
      final data = e.response!.data as Map;
      if (data.containsKey('message')) {
        return data['message'] as String;
      }
      if (data.containsKey('error')) {
        return data['error'] as String;
      }
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return 'Connection timed out. Please try again.';
    }
    if (e.type == DioExceptionType.connectionError) {
      return 'Unable to connect to server. Check your connection.';
    }
    return 'Something went wrong. Please try again.';
  }
}
