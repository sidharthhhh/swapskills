import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Application-wide constants for the SwapSkills app.
class AppConstants {
  AppConstants._();

  /// Base URL for the backend API.
  /// Use localhost for web/desktop, 10.0.2.2 for Android emulator.
  static String get apiBaseUrl => dotenv.env['BACKEND_API_URL'] ?? 'http://localhost:3000';

  /// Socket.IO chat namespace path.
  static const String socketChatNamespace = '/chat';

  /// Token storage keys.
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';

  /// Pagination defaults.
  static const int defaultPageSize = 20;

  /// Timeouts.
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);

  /// App info.
  static const String appName = 'SwapSkills';
  static const String appVersion = '1.0.0';
}
