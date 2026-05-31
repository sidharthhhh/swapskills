import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/profile_provider.dart';
import '../../skills/widgets/skill_picker.dart';
import '../../auth/providers/auth_provider.dart';
import '../../../core/router.dart';

/// Profile screen displaying user info with edit capabilities.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isEditing = false;
  bool _isSaving = false;

  late TextEditingController _bioController;
  String _selectedAvailability = 'weekends';
  String _selectedExperienceLevel = 'beginner';

  static const _availabilityOptions = [
    'weekdays',
    'weekends',
    'evenings',
    'flexible',
  ];

  static const _experienceLevels = [
    'beginner',
    'intermediate',
    'advanced',
    'expert',
  ];

  @override
  void initState() {
    super.initState();
    _bioController = TextEditingController();
  }

  @override
  void dispose() {
    _bioController.dispose();
    super.dispose();
  }

  void _enterEditMode(UserProfile profile) {
    setState(() {
      _isEditing = true;
      _bioController.text = profile.bio ?? '';
      _selectedAvailability = profile.availability;
      _selectedExperienceLevel = profile.experienceLevel;
    });
  }

  void _cancelEdit() {
    setState(() => _isEditing = false);
  }

  Future<void> _showLogoutDialog() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await ref.read(authProvider.notifier).logout();
      if (mounted) {
        // Navigate to login
        final router = ref.read(routerProvider);
        router.go('/login');
      }
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);

    final success = await ref.read(profileProvider.notifier).updateProfile(
          bio: _bioController.text.trim(),
          availability: _selectedAvailability,
          experienceLevel: _selectedExperienceLevel,
        );

    setState(() {
      _isSaving = false;
      if (success) _isEditing = false;
    });

    if (mounted && !success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to update profile')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            tooltip: 'Settings',
            onPressed: () => context.push('/settings'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Logout',
            onPressed: () => _showLogoutDialog(),
          ),
          profileAsync.whenOrNull(
                data: (profile) {
                  if (profile == null) return null;
                  if (_isEditing) {
                    return Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextButton(
                          onPressed: _cancelEdit,
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: _isSaving ? null : _saveProfile,
                          child: _isSaving
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Text('Save'),
                        ),
                      ],
                    );
                  }
                  return IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () => _enterEditMode(profile),
                  );
                },
              ) ??
              const SizedBox.shrink(),
        ],
      ),
      body: profileAsync.when(
        data: (profile) {
          if (profile == null) {
            return const Center(child: Text('Failed to load profile'));
          }
          return _buildProfileContent(profile);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('Error loading profile'),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => ref.invalidate(profileProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileContent(UserProfile profile) {
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(profileProvider),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(profile),
            const SizedBox(height: 24),
            _buildBioSection(profile),
            const SizedBox(height: 24),
            _buildDetailsSection(profile),
            const SizedBox(height: 24),
            _buildTeachSkillsSection(profile),
            const SizedBox(height: 24),
            _buildLearnSkillsSection(profile),
            const SizedBox(height: 24),
            _buildEndorsementsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(UserProfile profile) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            // Trust score circular indicator
            _TrustScoreIndicator(score: profile.trustScore),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    profile.username,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  _ExperienceBadge(level: profile.experienceLevel),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.schedule,
                        size: 16,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatAvailability(profile.availability),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBioSection(UserProfile profile) {
    final theme = Theme.of(context);

    if (_isEditing) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Bio', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _bioController,
            maxLines: 4,
            maxLength: 500,
            decoration: const InputDecoration(
              hintText: 'Tell others about yourself...',
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Bio', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Text(
          profile.bio?.isNotEmpty == true
              ? profile.bio!
              : 'No bio yet. Tap edit to add one.',
          style: theme.textTheme.bodyLarge?.copyWith(
            color: profile.bio?.isNotEmpty == true
                ? null
                : theme.colorScheme.onSurfaceVariant,
            fontStyle: profile.bio?.isNotEmpty == true
                ? null
                : FontStyle.italic,
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsSection(UserProfile profile) {
    final theme = Theme.of(context);

    if (_isEditing) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Availability', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _selectedAvailability,
            items: _availabilityOptions.map((option) {
              return DropdownMenuItem(
                value: option,
                child: Text(_formatAvailability(option)),
              );
            }).toList(),
            onChanged: (value) {
              if (value != null) {
                setState(() => _selectedAvailability = value);
              }
            },
          ),
          const SizedBox(height: 16),
          Text('Experience Level', style: theme.textTheme.titleMedium),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _selectedExperienceLevel,
            items: _experienceLevels.map((level) {
              return DropdownMenuItem(
                value: level,
                child: Text(_formatExperienceLevel(level)),
              );
            }).toList(),
            onChanged: (value) {
              if (value != null) {
                setState(() => _selectedExperienceLevel = value);
              }
            },
          ),
        ],
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildTeachSkillsSection(UserProfile profile) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Skills I Teach', style: theme.textTheme.titleMedium),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () => _showSkillPicker(isTeach: true, profile: profile),
              tooltip: 'Add teach skill',
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (profile.teachSkills.isEmpty)
          Text(
            'No teach skills added yet',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: profile.teachSkills.map((skill) {
              return Chip(
                label: Text(skill.name),
                deleteIcon: const Icon(Icons.close, size: 18),
                onDeleted: () => _removeTeachSkill(skill.id),
                backgroundColor:
                    theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildLearnSkillsSection(UserProfile profile) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Skills I Want to Learn', style: theme.textTheme.titleMedium),
            IconButton(
              icon: const Icon(Icons.add_circle_outline),
              onPressed: () =>
                  _showSkillPicker(isTeach: false, profile: profile),
              tooltip: 'Add learn skill',
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (profile.learnSkills.isEmpty)
          Text(
            'No learn skills added yet',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontStyle: FontStyle.italic,
            ),
          )
        else
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: profile.learnSkills.map((skill) {
              return Chip(
                label: Text(skill.name),
                deleteIcon: const Icon(Icons.close, size: 18),
                onDeleted: () => _removeLearnSkill(skill.id),
                backgroundColor:
                    theme.colorScheme.secondaryContainer.withValues(alpha: 0.5),
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildEndorsementsSection() {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Endorsements Received', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Text(
                'Endorsements will appear here after completing sessions.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontStyle: FontStyle.italic,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showSkillPicker({
    required bool isTeach,
    required UserProfile profile,
  }) {
    final existingIds = isTeach
        ? profile.teachSkills.map((s) => s.id).toSet()
        : profile.learnSkills.map((s) => s.id).toSet();

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return SkillPickerDialog(
              title: isTeach ? 'Add Teach Skills' : 'Add Learn Skills',
              selectedSkillIds: existingIds,
              onSkillSelected: (skill) {
                // Optimistically update UI immediately
                setDialogState(() => existingIds.add(skill.id));
                // Then call API in background
                if (isTeach) {
                  ref.read(profileProvider.notifier).addTeachSkill(skill.id);
                } else {
                  ref.read(profileProvider.notifier).addLearnSkill(skill.id);
                }
              },
              onSkillDeselected: (skill) {
                // Optimistically update UI immediately
                setDialogState(() => existingIds.remove(skill.id));
                // Then call API in background
                if (isTeach) {
                  ref.read(profileProvider.notifier).removeTeachSkill(skill.id);
                } else {
                  ref.read(profileProvider.notifier).removeLearnSkill(skill.id);
                }
              },
            );
          },
        );
      },
    );
  }

  Future<void> _removeTeachSkill(String skillId) async {
    final success =
        await ref.read(profileProvider.notifier).removeTeachSkill(skillId);
    if (mounted && !success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to remove skill')),
      );
    }
  }

  Future<void> _removeLearnSkill(String skillId) async {
    final success =
        await ref.read(profileProvider.notifier).removeLearnSkill(skillId);
    if (mounted && !success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to remove skill')),
      );
    }
  }

  String _formatAvailability(String availability) {
    switch (availability) {
      case 'weekdays':
        return 'Weekdays';
      case 'weekends':
        return 'Weekends';
      case 'evenings':
        return 'Evenings';
      case 'flexible':
        return 'Flexible';
      default:
        return availability;
    }
  }

  String _formatExperienceLevel(String level) {
    switch (level) {
      case 'beginner':
        return 'Beginner';
      case 'intermediate':
        return 'Intermediate';
      case 'advanced':
        return 'Advanced';
      case 'expert':
        return 'Expert';
      default:
        return level;
    }
  }
}

/// Circular trust score indicator widget.
class _TrustScoreIndicator extends StatelessWidget {
  final double score;

  const _TrustScoreIndicator({required this.score});

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
      width: 72,
      height: 72,
      child: CustomPaint(
        painter: _TrustScorePainter(
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
                style: theme.textTheme.titleMedium?.copyWith(
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

/// Custom painter for the circular trust score arc.
class _TrustScorePainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color backgroundColor;

  _TrustScorePainter({
    required this.progress,
    required this.color,
    required this.backgroundColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - 8) / 2;
    const strokeWidth = 6.0;

    // Background arc
    final bgPaint = Paint()
      ..color = backgroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    // Progress arc
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
  bool shouldRepaint(covariant _TrustScorePainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

/// Experience level badge widget.
class _ExperienceBadge extends StatelessWidget {
  final String level;

  const _ExperienceBadge({required this.level});

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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: badgeColor.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(badgeIcon, size: 14, color: badgeColor),
          const SizedBox(width: 4),
          Text(
            _capitalize(level),
            style: theme.textTheme.labelSmall?.copyWith(
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
