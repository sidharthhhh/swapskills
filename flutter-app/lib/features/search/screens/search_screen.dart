import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../services/api_service.dart';

/// Model for a search result user.
class SearchUser {
  final String uid;
  final String username;
  final double trustScore;
  final String experienceLevel;

  const SearchUser({
    required this.uid,
    required this.username,
    required this.trustScore,
    required this.experienceLevel,
  });

  factory SearchUser.fromJson(Map<String, dynamic> json) {
    return SearchUser(
      uid: json['uid']?.toString() ?? '',
      username: json['username'] as String? ?? '',
      trustScore: double.tryParse(json['trust_score']?.toString() ?? '50') ?? 50.0,
      experienceLevel: json['experience_level'] as String? ?? 'beginner',
    );
  }
}

/// Provider for search results based on query.
final searchQueryProvider = StateProvider<String>((ref) => '');

final searchResultsProvider = FutureProvider<List<SearchUser>>((ref) async {
  final query = ref.watch(searchQueryProvider);
  if (query.trim().isEmpty) return [];

  try {
    final api = ref.read(apiServiceProvider);
    final response = await api.dio.get(
      '/api/v1/users/search',
      queryParameters: {'q': query.trim()},
    );

    if (response.statusCode == 200 && response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] as List<dynamic>;
      return data
          .map((e) => SearchUser.fromJson(e as Map<String, dynamic>))
          .toList();
    }
  } on DioException catch (_) {
    // Search failed.
  }
  return [];
});

/// In-app search screen for finding users by username.
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchController = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      ref.read(searchQueryProvider.notifier).state = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    final resultsAsync = ref.watch(searchResultsProvider);
    final query = ref.watch(searchQueryProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Search users...',
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
          ),
          onChanged: _onSearchChanged,
        ),
        actions: [
          if (_searchController.text.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                ref.read(searchQueryProvider.notifier).state = '';
              },
            ),
        ],
      ),
      body: query.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.search,
                    size: 64,
                    color: theme.colorScheme.outlineVariant,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Search for users by username',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            )
          : resultsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (_, __) => const Center(
                child: Text('Search failed. Try again.'),
              ),
              data: (results) {
                if (results.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.person_search,
                            size: 48, color: Colors.grey),
                        const SizedBox(height: 16),
                        Text(
                          'No users found for "$query"',
                          style: theme.textTheme.bodyLarge,
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: results.length,
                  itemBuilder: (context, index) {
                    final user = results[index];
                    return _SearchResultTile(user: user);
                  },
                );
              },
            ),
    );
  }
}

/// Tile widget for a single search result.
class _SearchResultTile extends StatelessWidget {
  final SearchUser user;

  const _SearchResultTile({required this.user});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color scoreColor;
    if (user.trustScore >= 75) {
      scoreColor = Colors.green;
    } else if (user.trustScore >= 50) {
      scoreColor = Colors.orange;
    } else {
      scoreColor = Colors.red;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Text(
            user.username.isNotEmpty ? user.username[0].toUpperCase() : '?',
            style: TextStyle(
              color: theme.colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          user.username,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Row(
          children: [
            Icon(Icons.verified_user, size: 14, color: scoreColor),
            const SizedBox(width: 4),
            Text(
              'Trust: ${user.trustScore.toInt()}',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(width: 12),
            Icon(Icons.school, size: 14, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 4),
            Text(
              _capitalize(user.experienceLevel),
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/user/${user.uid}'),
      ),
    );
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}
