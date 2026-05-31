import 'dart:math' as math;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../services/api_service.dart';
import '../providers/profile_provider.dart';

/// Provider to fetch a public user profile by UID.
final userPreviewProvider =
    FutureProvider.family<UserProfile?, String>((ref, uid) async {
  try {
    final api = ref.read(apiServiceProvider);
    final response = await api.dio.get('/api/v1/users/$uid');

    if (response.statusCode == 200 && response.data['success'] == true) {
      return UserProfile.fromJson(response.data['data'] as Map<String, dynamic>);
    }
  } on DioException catch (_) {
    // Failed to fetch user profile.
  }
  return null;
});

/// Screen showing a detailed preview of another user's profile.
class UserPreviewScreen extends ConsumerWidget {
  final String uid;

  const UserPreviewScreen({super.key, required this.uid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profileAsync = ref.watch(userPreviewProvider(uid));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
      ),
      body: profileAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Failed to load profile')),
        data: (profile) {
          if (profile == null) {
            return const Center(child: Text('User not found'));
          }
          return _buildContent(context, ref, profile);
        },
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, UserProfile profile) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with avatar, name, trust score
                Center(
                  child: Column(
                    children: [
                      _TrustScoreRing(score: profile.trustScore),
                      const SizedBox(height: 16),
                      Text(
                        profile.username,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      _ExperienceLevelBadge(level: profile.experienceLevel),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Bio
                if (profile.bio != null && profile.bio!.isNotEmpty) ...[
                  Text('About', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 8),
                  Text(
                    profile.bio!,
                    style: theme.textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 24),
                ],

                // Teach skills
                Text('Can Teach', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                if (profile.teachSkills.isEmpty)
                  Text(
                    'No teach skills listed',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      fontStyle: FontStyle.italic,
                    ),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: profile.teachSkills.map((skill) {
                      return Chip(
                        avatar: Icon(Icons.school, size: 16, color: Colors.green.shade700),
                        label: Text(skill.name),
                        backgroundColor: colorScheme.primaryContainer.withOpacity(0.5),
                      );
                    }).toList(),
                  ),
                const SizedBox(height: 24),

                // Learn skills
                Text('Wants to Learn', style: theme.textTheme.titleMedium),
                const SizedBox(height: 8),
                if (profile.learnSkills.isEmpty)
                  Text(
                    'No learn skills listed',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                      fontStyle: FontStyle.italic,
                    ),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: profile.learnSkills.map((skill) {
                      return Chip(
                        avatar: Icon(Icons.lightbulb, size: 16, color: Colors.blue.shade700),
                        label: Text(skill.name),
                        backgroundColor: colorScheme.secondaryContainer.withOpacity(0.5),
                      );
                    }).toList(),
                  ),
              ],
            ),
          ),
        ),
        // Send Request button
        Container(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).padding.bottom + 16,
            top: 12,
          ),
          decoration: BoxDecoration(
            color: colorScheme.surface,
            border: Border(
              top: BorderSide(
                color: colorScheme.outlineVariant.withOpacity(0.3),
              ),
            ),
          ),
          child: SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: () => _sendRequest(context, ref, profile),
              icon: const Icon(Icons.handshake),
              label: const Text('Send Request'),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _sendRequest(BuildContext context, WidgetRef ref, UserProfile profile) async {
    // For a basic request, we need skill IDs. Since we're viewing a profile,
    // we'll send a request with the first matching teach/learn skill pair.
    if (profile.teachSkills.isEmpty || profile.learnSkills.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This user has no skills configured for matching')),
      );
      return;
    }

    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.dio.post(
        '/api/v1/matches/request',
        data: {
          'receiverId': int.tryParse(uid) ?? uid,
          'teachSkillId': int.tryParse(profile.teachSkills.first.id) ?? profile.teachSkills.first.id,
          'learnSkillId': int.tryParse(profile.learnSkills.first.id) ?? profile.learnSkills.first.id,
        },
      );

      if (context.mounted) {
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
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to send request. Try again.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

/// Circular trust score ring widget.
class _TrustScoreRing extends StatelessWidget {
  final double score;

  const _TrustScoreRing({required this.score});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final normalizedScore = (score / 100).clamp(0.0, 1.0);

    Color scoreColor;
    if (score >= 75) {
      scoreColor = Colors.green;
    } else if (score >= 50) {
      scoreColor = Colors.orange;
    } else {
      scoreColor = Colors.red;
    }

    return SizedBox(
      width: 96,
      height: 96,
      child: CustomPaint(
        painter: _RingPainter(
          progress: normalizedScore,
          color: scoreColor,
          backgroundColor: theme.colorScheme.surfaceContainerHighest,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                score.toInt().toString(),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: scoreColor,
                ),
              ),
              Text(
                'Trust',
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color backgroundColor;

  _RingPainter({
    required this.progress,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 10) / 2;
    const strokeWidth = 8.0;

    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

/// Experience level badge.
class _ExperienceLevelBadge extends StatelessWidget {
  final String level;

  const _ExperienceLevelBadge({required this.level});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Color badgeColor;
    IconData badgeIcon;
    switch (level) {
      case 'expert':
        badgeColor = Colors.purple;
        badgeIcon = Icons.star;
        break;
      case 'advanced':
        badgeColor = Colors.blue;
        badgeIcon = Icons.trending_up;
        break;
      case 'intermediate':
        badgeColor = Colors.orange;
        badgeIcon = Icons.school;
        break;
      default:
        badgeColor = Colors.green;
        badgeIcon = Icons.eco;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: badgeColor.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(badgeIcon, size: 16, color: badgeColor),
          const SizedBox(width: 6),
          Text(
            _capitalize(level),
            style: theme.textTheme.labelMedium?.copyWith(
              color: badgeColor,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _capitalize(String s) {
    if (s.isEmpty) return s;
    return s[0].toUpperCase() + s.substring(1);
  }
}
