import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/matching_provider.dart';

/// Screen displaying the list of active matches.
/// Each match shows partner username, skills being exchanged, and status.
/// Tapping a match navigates to the chat room.
class ActiveMatchesScreen extends ConsumerWidget {
  const ActiveMatchesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final matchesAsync = ref.watch(activeMatchesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Matches'),
      ),
      body: matchesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text('Failed to load matches'),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: () =>
                    ref.read(activeMatchesProvider.notifier).refresh(),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (matches) {
          if (matches.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.people_outline, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No active matches yet'),
                  SizedBox(height: 8),
                  Text(
                    'Start swiping to find skill exchange partners!',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () =>
                ref.read(activeMatchesProvider.notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: matches.length,
              itemBuilder: (context, index) {
                final match = matches[index];
                return _ActiveMatchTile(match: match);
              },
            ),
          );
        },
      ),
    );
  }
}

class _ActiveMatchTile extends StatelessWidget {
  final ActiveMatch match;

  const _ActiveMatchTile({required this.match});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(
            Icons.person,
            color: theme.colorScheme.onPrimaryContainer,
          ),
        ),
        title: Text(
          match.partnerUsername,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.swap_horiz, size: 16, color: Colors.green.shade700),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    '${match.teachSkillName} ↔ ${match.learnSkillName}',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            _StatusChip(status: match.status),
          ],
        ),
        trailing: const Icon(Icons.chat_bubble_outline),
        onTap: () {
          if (match.chatRoomId.isNotEmpty) {
            context.push('/chat/${match.chatRoomId}');
          }
        },
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color chipColor;
    switch (status.toLowerCase()) {
      case 'active':
        chipColor = Colors.green;
        break;
      case 'completed':
        chipColor = Colors.blue;
        break;
      case 'paused':
        chipColor = Colors.orange;
        break;
      default:
        chipColor = Colors.grey;
    }

    return Chip(
      label: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          color: chipColor,
          fontWeight: FontWeight.bold,
        ),
      ),
      backgroundColor: chipColor.withValues(alpha: 0.1),
      padding: EdgeInsets.zero,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}
