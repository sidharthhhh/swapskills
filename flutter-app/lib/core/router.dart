import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/auth/screens/register_screen.dart';
import '../features/auth/screens/recovery_screen.dart';
import '../features/chat/screens/chat_list_screen.dart';
import '../features/chat/screens/chat_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/matching/screens/matches_screen.dart';
import '../features/matching/screens/active_matches_screen.dart';
import '../features/matching/screens/pending_requests_screen.dart';
import '../features/notifications/screens/notifications_screen.dart';
import '../features/onboarding/screens/onboarding_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/profile/screens/user_preview_screen.dart';
import '../features/search/screens/search_screen.dart';
import '../features/sessions/screens/sessions_screen.dart';
import '../features/settings/screens/settings_screen.dart';
import '../features/community/screens/community_screen.dart';
import '../services/secure_storage_service.dart';

/// Auth state provider that checks if the user has a stored token.
/// Returns true if authenticated, false otherwise.
final isAuthenticatedProvider = FutureProvider<bool>((ref) async {
  final storage = ref.read(secureStorageServiceProvider);
  final token = await storage.getAccessToken();
  return token != null;
});

/// GoRouter provider with auth redirect guard.
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    redirect: (BuildContext context, GoRouterState state) async {
      final storage = ref.read(secureStorageServiceProvider);
      final hasToken = await storage.getAccessToken() != null;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register' ||
          state.matchedLocation == '/recover';

      // If not authenticated and trying to access protected route, redirect to login.
      if (!hasToken && !isAuthRoute) {
        return '/login';
      }

      // If authenticated and on auth route, redirect to home.
      if (hasToken && isAuthRoute) {
        return '/home';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        name: 'register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/recover',
        name: 'recover',
        builder: (context, state) => const RecoveryScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        name: 'onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: '/home',
        name: 'home',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/settings',
        name: 'settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/search',
        name: 'search',
        builder: (context, state) => const SearchScreen(),
      ),
      GoRoute(
        path: '/user/:uid',
        name: 'userPreview',
        builder: (context, state) => UserPreviewScreen(
          uid: state.pathParameters['uid']!,
        ),
      ),
      GoRoute(
        path: '/matches',
        name: 'matches',
        builder: (context, state) => const MatchesScreen(),
        routes: [
          GoRoute(
            path: 'active',
            name: 'activeMatches',
            builder: (context, state) => const ActiveMatchesScreen(),
          ),
          GoRoute(
            path: 'pending',
            name: 'pendingRequests',
            builder: (context, state) => const PendingRequestsScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/chat',
        name: 'chatList',
        builder: (context, state) => const ChatListScreen(),
        routes: [
          GoRoute(
            path: ':roomId',
            name: 'chatRoom',
            builder: (context, state) => ChatScreen(
              roomId: state.pathParameters['roomId'] ?? '',
              partnerUsername: state.uri.queryParameters['partner'],
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/sessions',
        name: 'sessions',
        builder: (context, state) => SessionsScreen(
          matchId: state.uri.queryParameters['matchId'],
        ),
      ),
      GoRoute(
        path: '/community',
        name: 'community',
        builder: (context, state) => const CommunityScreen(),
      ),
      GoRoute(
        path: '/profile',
        name: 'profile',
        builder: (context, state) => const ProfileScreen(),
      ),
      GoRoute(
        path: '/notifications',
        name: 'notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
    ],
  );
});
