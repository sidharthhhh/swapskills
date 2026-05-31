import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../services/api_service.dart';
import '../providers/matching_provider.dart';

/// Main matches screen with swipeable card-stack interface.
/// Shows anonymous user suggestions for skill exchange matching.
class MatchesScreen extends ConsumerStatefulWidget {
  const MatchesScreen({super.key});

  @override
  ConsumerState<MatchesScreen> createState() => _MatchesScreenState();
}

class _MatchesScreenState extends ConsumerState<MatchesScreen> {
  final CardSwiperController _swiperController = CardSwiperController();

  @override
  void dispose() {
    _swiperController.dispose();
    super.dispose();
  }

  Future<void> _sendMatchRequest(MatchSuggestion suggestion) async {
    final api = ref.read(apiServiceProvider);
    try {
      final response = await api.dio.post(
        '/api/v1/matches/request',
        data: {
          'receiverId': int.tryParse(suggestion.userId) ?? suggestion.userId,
          'teachSkillId': int.tryParse(suggestion.teachSkillId) ?? suggestion.teachSkillId,
          'learnSkillId': int.tryParse(suggestion.learnSkillId) ?? suggestion.learnSkillId,
        },
      );
      if (mounted) {
        if (response.statusCode == 200 || response.statusCode == 201) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Match request sent!'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send request. Try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  bool _onSwipe(
    int previousIndex,
    int? currentIndex,
    CardSwiperDirection direction,
    List<MatchSuggestion> suggestions,
  ) {
    if (direction == CardSwiperDirection.right) {
      _sendMatchRequest(suggestions[previousIndex]);
    }
    // Left swipe = dismiss, no action needed.
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final suggestionsAsync = ref.watch(suggestionsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Find Matches'),
        actions: [
          IconButton(
            icon: const Icon(Icons.people),
            tooltip: 'Active Matches',
            onPressed: () => context.push('/matches/active'),
          ),
          IconButton(
            icon: const Icon(Icons.inbox),
            tooltip: 'Pending Requests',
            onPressed: () => context.push('/matches/pending'),
          ),
        ],
      ),
      body: suggestionsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                'Failed to load suggestions',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () => ref.read(suggestionsProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (suggestions) {
          if (suggestions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.search_off, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  Text(
                    'No suggestions available',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Add more skills to your profile\nto get better matches.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () =>
                        ref.read(suggestionsProvider.notifier).refresh(),
                    child: const Text('Refresh'),
                  ),
                ],
              ),
            );
          }

          return Column(
            children: [
              Expanded(
                child: CardSwiper(
                  controller: _swiperController,
                  cardsCount: suggestions.length,
                  numberOfCardsDisplayed:
                      suggestions.length < 3 ? suggestions.length : 3,
                  onSwipe: (prev, curr, dir) =>
                      _onSwipe(prev, curr, dir, suggestions),
                  onEnd: () {
                    ref.read(suggestionsProvider.notifier).refresh();
                  },
                  cardBuilder: (context, index, percentThresholdX,
                      percentThresholdY) {
                    return _SuggestionCard(suggestion: suggestions[index]);
                  },
                ),
              ),
              // Action buttons below cards
              Padding(
                padding: const EdgeInsets.only(bottom: 32, top: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Reject / Dismiss button
                    FloatingActionButton(
                      heroTag: 'dismiss',
                      onPressed: () =>
                          _swiperController.swipe(CardSwiperDirection.left),
                      backgroundColor: Colors.red.shade100,
                      child: const Icon(Icons.close, color: Colors.red),
                    ),
                    // Connect / Match button
                    FloatingActionButton(
                      heroTag: 'connect',
                      onPressed: () =>
                          _swiperController.swipe(CardSwiperDirection.right),
                      backgroundColor: Colors.green.shade100,
                      child:
                          const Icon(Icons.handshake, color: Colors.green),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Card widget displaying an anonymous user suggestion.
class _SuggestionCard extends StatelessWidget {
  final MatchSuggestion suggestion;

  const _SuggestionCard({required this.suggestion});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: () => context.push('/user/${suggestion.uid}'),
      child: Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Anonymous username
              Center(
                child: CircleAvatar(
                  radius: 28,
                  backgroundColor: theme.colorScheme.primaryContainer,
                  child: Icon(
                    Icons.person,
                    size: 28,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  suggestion.username,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Trust score
              Row(
                children: [
                  const Icon(Icons.verified_user, size: 18, color: Colors.amber),
                  const SizedBox(width: 6),
                  Text(
                    'Trust Score: ${suggestion.trustScore.toStringAsFixed(0)}',
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Skills summary
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.school, size: 18, color: Colors.green.shade700),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Can teach: ${suggestion.teachSkillName}',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(Icons.lightbulb, size: 18, color: Colors.blue.shade700),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Wants to learn: ${suggestion.learnSkillName}',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              // Swipe hints
              Center(
                child: Text(
                  'Tap for profile • Swipe to connect',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
