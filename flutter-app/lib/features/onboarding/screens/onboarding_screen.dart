import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../skills/providers/skills_provider.dart';
import '../../skills/widgets/skill_picker.dart';
import '../../profile/providers/profile_provider.dart';

/// Onboarding screen shown after registration when user has no skills.
/// Three-step flow: teach skills → learn skills → summary.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final Set<String> _teachSkillIds = {};
  final Set<String> _learnSkillIds = {};
  final List<Skill> _teachSkills = [];
  final List<Skill> _learnSkills = [];
  bool _isSaving = false;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage == 0 && _teachSkillIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one skill to teach')),
      );
      return;
    }
    if (_currentPage == 1 && _learnSkillIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one skill to learn')),
      );
      return;
    }
    _pageController.nextPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  void _previousPage() {
    _pageController.previousPage(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  Future<void> _completeOnboarding() async {
    setState(() => _isSaving = true);

    final profileNotifier = ref.read(profileProvider.notifier);

    // Add teach skills
    for (final skillId in _teachSkillIds) {
      await profileNotifier.addTeachSkill(skillId);
    }

    // Add learn skills
    for (final skillId in _learnSkillIds) {
      await profileNotifier.addLearnSkill(skillId);
    }

    setState(() => _isSaving = false);

    if (mounted) {
      context.go('/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Dot indicators
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(3, (index) {
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentPage == index
                          ? colorScheme.primary
                          : colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),
            ),
            // Page content
            Expanded(
              child: PageView(
                controller: _pageController,
                physics: const NeverScrollableScrollPhysics(),
                onPageChanged: (page) {
                  setState(() => _currentPage = page);
                },
                children: [
                  _buildTeachPage(context),
                  _buildLearnPage(context),
                  _buildSummaryPage(context),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeachPage(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What can you teach?',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Select skills you can share with others.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: SkillPicker(
              selectedSkillIds: _teachSkillIds,
              onSkillSelected: (skill) {
                setState(() {
                  _teachSkillIds.add(skill.id);
                  _teachSkills.add(skill);
                });
              },
              onSkillDeselected: (skill) {
                setState(() {
                  _teachSkillIds.remove(skill.id);
                  _teachSkills.removeWhere((s) => s.id == skill.id);
                });
              },
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _nextPage,
              child: const Text('Next'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLearnPage(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'What do you want to learn?',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Select skills you want to learn from others.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: SkillPicker(
              selectedSkillIds: _learnSkillIds,
              onSkillSelected: (skill) {
                setState(() {
                  _learnSkillIds.add(skill.id);
                  _learnSkills.add(skill);
                });
              },
              onSkillDeselected: (skill) {
                setState(() {
                  _learnSkillIds.remove(skill.id);
                  _learnSkills.removeWhere((s) => s.id == skill.id);
                });
              },
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _previousPage,
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: _nextPage,
                  child: const Text('Next'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryPage(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const Spacer(),
          Icon(
            Icons.check_circle_outline,
            size: 80,
            color: colorScheme.primary,
          ),
          const SizedBox(height: 24),
          Text(
            "You're all set!",
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'Here\'s a summary of your skills:',
            style: theme.textTheme.bodyLarge?.copyWith(
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 24),
          // Teach skills summary
          _buildSkillSummarySection(
            context,
            'Teaching',
            _teachSkills,
            Icons.school,
            Colors.green,
          ),
          const SizedBox(height: 16),
          // Learn skills summary
          _buildSkillSummarySection(
            context,
            'Learning',
            _learnSkills,
            Icons.lightbulb,
            Colors.blue,
          ),
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _previousPage,
                  child: const Text('Back'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: FilledButton(
                  onPressed: _isSaving ? null : _completeOnboarding,
                  child: _isSaving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Start Matching'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSkillSummarySection(
    BuildContext context,
    String title,
    List<Skill> skills,
    IconData icon,
    Color color,
  ) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 8),
              Text(
                title,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: skills.map((skill) {
              return Chip(
                label: Text(skill.name, style: const TextStyle(fontSize: 12)),
                visualDensity: VisualDensity.compact,
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
