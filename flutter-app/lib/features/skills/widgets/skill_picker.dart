import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/skills_provider.dart';

/// A categorized skill selection widget with search/filter functionality.
///
/// Shows skills grouped by category. Users can tap to select/deselect skills.
/// Includes a search bar to filter skills by name.
class SkillPicker extends ConsumerStatefulWidget {
  /// Currently selected skill IDs.
  final Set<String> selectedSkillIds;

  /// Callback when a skill is selected.
  final void Function(Skill skill) onSkillSelected;

  /// Callback when a skill is deselected.
  final void Function(Skill skill) onSkillDeselected;

  /// Optional title displayed at the top.
  final String? title;

  const SkillPicker({
    super.key,
    required this.selectedSkillIds,
    required this.onSkillSelected,
    required this.onSkillDeselected,
    this.title,
  });

  @override
  ConsumerState<SkillPicker> createState() => _SkillPickerState();
}

class _SkillPickerState extends ConsumerState<SkillPicker> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(skillCategoriesProvider);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.title != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              widget.title!,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        // Search bar
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search skills...',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                  )
                : null,
          ),
          onChanged: (value) {
            setState(() => _searchQuery = value.toLowerCase());
          },
        ),
        const SizedBox(height: 16),
        // Skill categories
        Expanded(
          child: categoriesAsync.when(
            data: (categories) {
              final filtered = _filterCategories(categories);
              if (filtered.isEmpty) {
                return const Center(
                  child: Text('No skills found'),
                );
              }
              return ListView.builder(
                itemCount: filtered.length,
                itemBuilder: (context, index) {
                  return _CategorySection(
                    category: filtered[index],
                    selectedSkillIds: widget.selectedSkillIds,
                    onSkillSelected: widget.onSkillSelected,
                    onSkillDeselected: widget.onSkillDeselected,
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, __) => const Center(
              child: Text('Failed to load skills'),
            ),
          ),
        ),
      ],
    );
  }

  /// Filter categories based on the search query.
  List<SkillCategory> _filterCategories(List<SkillCategory> categories) {
    if (_searchQuery.isEmpty) return categories;

    final result = <SkillCategory>[];
    for (final category in categories) {
      final matchingSkills = category.skills
          .where((s) => s.name.toLowerCase().contains(_searchQuery))
          .toList();
      if (matchingSkills.isNotEmpty) {
        result.add(SkillCategory(
          category: category.category,
          skills: matchingSkills,
        ));
      }
    }
    return result;
  }
}

/// A section displaying a single category and its skills as chips.
class _CategorySection extends StatelessWidget {
  final SkillCategory category;
  final Set<String> selectedSkillIds;
  final void Function(Skill skill) onSkillSelected;
  final void Function(Skill skill) onSkillDeselected;

  const _CategorySection({
    required this.category,
    required this.selectedSkillIds,
    required this.onSkillSelected,
    required this.onSkillDeselected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            category.category,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.primary,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: category.skills.map((skill) {
              final isSelected = selectedSkillIds.contains(skill.id);
              return FilterChip(
                label: Text(skill.name),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    onSkillSelected(skill);
                  } else {
                    onSkillDeselected(skill);
                  }
                },
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

/// A dialog version of the skill picker for modal presentation.
class SkillPickerDialog extends StatelessWidget {
  final Set<String> selectedSkillIds;
  final void Function(Skill skill) onSkillSelected;
  final void Function(Skill skill) onSkillDeselected;
  final String title;

  const SkillPickerDialog({
    super.key,
    required this.selectedSkillIds,
    required this.onSkillSelected,
    required this.onSkillDeselected,
    this.title = 'Select Skills',
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(),
            Flexible(
              child: SkillPicker(
                selectedSkillIds: selectedSkillIds,
                onSkillSelected: onSkillSelected,
                onSkillDeselected: onSkillDeselected,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Done'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
