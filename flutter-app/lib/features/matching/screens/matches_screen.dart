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
    final colorScheme = theme.colorScheme;

    return GestureDetector(
      onTap: () => context.push('/user/${suggestion.uid}'),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              colorScheme.primaryContainer,
              colorScheme.secondaryContainer,
            ],
          ),
          boxShadow: [
            BoxShadow(
              color: colorScheme.shadow.withOpacity(0.15),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(28),
          child: Stack(
            children: [
              // Decorative background circles
              Positioned(
                top: -60,
                right: -40,
                child: CircleAvatar(
                  radius: 120,
                  backgroundColor: colorScheme.primary.withOpacity(0.1),
                ),
              ),
              Positioned(
                bottom: -50,
                left: -50,
                child: CircleAvatar(
                  radius: 100,
                  backgroundColor: colorScheme.secondary.withOpacity(0.1),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Spacer(flex: 1),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: colorScheme.surface,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 15,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 56,
                          backgroundColor: colorScheme.primary,
                          child: Text(
                            suggestion.username.isNotEmpty
                                ? suggestion.username[0].toUpperCase()
                                : '?',
                            style: theme.textTheme.displaySmall?.copyWith(
                              color: colorScheme.onPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        suggestion.username,
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: colorScheme.onPrimaryContainer,
                          letterSpacing: -0.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.amber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.amber.withOpacity(0.5)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.verified, size: 18, color: Colors.amber),
                            const SizedBox(width: 8),
                            Text(
                              'Trust Score: ${suggestion.trustScore.toStringAsFixed(0)}',
                              style: theme.textTheme.labelLarge?.copyWith(
                                color: Colors.amber.shade900,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Spacer(flex: 2),
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: colorScheme.surface.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: colorScheme.outline.withOpacity(0.2),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        children: [
                          _buildSkillRow(
                            context,
                            Icons.school,
                            'Can teach',
                            suggestion.teachSkillName,
                            Colors.green,
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Divider(height: 1),
                          ),
                          _buildSkillRow(
                            context,
                            Icons.lightbulb,
                            'Wants to learn',
                            suggestion.learnSkillName,
                            Colors.blue,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        'Tap for profile • Swipe to connect',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: colorScheme.onSurfaceVariant.withOpacity(0.8),
                          letterSpacing: 0.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkillRow(
      BuildContext context, IconData icon, String label, String skill, Color color) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, size: 24, color: color),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                skill,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
